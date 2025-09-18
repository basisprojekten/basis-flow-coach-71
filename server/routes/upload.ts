/**
 * Upload Routes - Handle .docx file uploads for cases and protocols
 */

import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger';
import { supabaseClient } from '../services/supabaseClient';

const router = express.Router();

// Multer error handler middleware
const handleMulterError = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer error during upload', {
      error: error.message,
      code: error.code,
      field: error.field
    });
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds 10MB limit'
      });
    }
    
    return res.status(400).json({
      error: 'UPLOAD_ERROR', 
      message: `File upload error: ${error.message}`
    });
  }
  
  if (error.message === 'Only .docx files are allowed') {
    return res.status(400).json({
      error: 'INVALID_FILE_TYPE',
      message: 'Only .docx files are allowed'
    });
  }
  
  next(error);
};

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/', // Temporary storage
  fileFilter: (req, file, cb) => {
    // Only accept .docx files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * POST /api/upload/case
 * Upload a .docx file and create a case record
 */
router.post('/case', upload.single('file'), handleMulterError, async (req, res) => {
  let tempFilePath: string | null = null;
  
  try {
    const { title } = req.body;
    const file = req.file;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        error: 'MISSING_TITLE',
        message: 'Title is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        error: 'NO_FILE_UPLOADED',
        message: 'No .docx file was uploaded'
      });
    }

    tempFilePath = file.path;

    logger.info('Processing case upload', {
      title,
      filename: file.originalname,
      fileSize: file.size
    });

    // Extract text from .docx file using mammoth
    const result = await mammoth.extractRawText({ path: tempFilePath });
    const rawText = result.value;

    if (!rawText.trim()) {
      return res.status(400).json({
        error: 'EMPTY_DOCUMENT',
        message: 'The uploaded document appears to be empty'
      });
    }

    // Save to Supabase
    const { data, error } = await supabaseClient
      .from('cases')
      .insert({
        title,
        raw_text: rawText
      })
      .select('id, title, raw_text')
      .single();

    if (error) {
      logger.error('Failed to save case to Supabase', {
        error: error.message,
        title
      });
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to save case to database'
      });
    }

    logger.info('Case saved successfully', {
      id: data.id,
      title: data.title,
      textLength: rawText.length
    });

    res.json({
      id: data.id,
      title: data.title,
      rawText: data.raw_text
    });

  } catch (error) {
    logger.error('Error processing case upload', {
      error: error instanceof Error ? error.message : String(error),
      title: req.body?.title,
      filename: req.file?.originalname || 'unknown'
    });

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        });
      }
      // Handle other multer errors
      return res.status(400).json({
        error: 'MULTER_ERROR',
        message: `File upload error: ${error.message}`
      });
    }

    return res.status(500).json({
      error: 'UPLOAD_ERROR',
      message: 'An unexpected error occurred during upload'
    });

  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        logger.debug('Temporary file deleted', { path: tempFilePath });
      } catch (cleanupError) {
        logger.warn('Failed to delete temporary file', {
          path: tempFilePath,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        });
      }
    }
  }
});

/**
 * POST /api/upload/protocol
 * Upload a .docx file and create a protocol record
 */
router.post('/protocol', upload.single('file'), handleMulterError, async (req, res) => {
  let tempFilePath: string | null = null;
  
  try {
    const { name, version, type } = req.body;
    const file = req.file;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'MISSING_NAME',
        message: 'Name is required'
      });
    }

    if (!type || !['base', 'content', 'process'].includes(type)) {
      return res.status(400).json({
        error: 'INVALID_TYPE',
        message: 'Type must be one of: base, content, process'
      });
    }

    if (!file) {
      return res.status(400).json({
        error: 'NO_FILE_UPLOADED',
        message: 'No .docx file was uploaded'
      });
    }

    tempFilePath = file.path;

    logger.info('Processing protocol upload', {
      name,
      version,
      type,
      filename: file.originalname,
      fileSize: file.size
    });

    // Extract text from .docx file using mammoth
    const result = await mammoth.extractRawText({ path: tempFilePath });
    const rawText = result.value;

    if (!rawText.trim()) {
      return res.status(400).json({
        error: 'EMPTY_DOCUMENT',
        message: 'The uploaded document appears to be empty'
      });
    }

    // Save to Supabase
    const { data, error } = await supabaseClient
      .from('protocols')
      .insert({
        name,
        version: version || null,
        type,
        raw_text: rawText
      })
      .select('id, name, version, type, raw_text')
      .single();

    if (error) {
      logger.error('Failed to save protocol to Supabase', {
        error: error.message,
        name,
        type
      });
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to save protocol to database'
      });
    }

    logger.info('Protocol saved successfully', {
      id: data.id,
      name: data.name,
      type: data.type,
      textLength: rawText.length
    });

    res.json({
      id: data.id,
      name: data.name,
      version: data.version,
      type: data.type,
      rawText: data.raw_text
    });

  } catch (error) {
    logger.error('Error processing protocol upload', {
      error: error instanceof Error ? error.message : String(error),
      name: req.body?.name,
      type: req.body?.type,
      filename: req.file?.originalname || 'unknown'
    });

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        });
      }
      // Handle other multer errors
      return res.status(400).json({
        error: 'MULTER_ERROR',
        message: `File upload error: ${error.message}`
      });
    }

    return res.status(500).json({
      error: 'UPLOAD_ERROR',
      message: 'An unexpected error occurred during upload'
    });

  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        logger.debug('Temporary file deleted', { path: tempFilePath });
      } catch (cleanupError) {
        logger.warn('Failed to delete temporary file', {
          path: tempFilePath,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        });
      }
    }
  }
});

export { router as uploadRoutes };