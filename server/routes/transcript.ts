/**
 * Transcript Routes - Conversation transcript analysis endpoints
 */

import express from 'express';
import { createAgent } from '../agents/baseAgent';
import { logger } from '../config/logger';
import { validateAgentResponse } from '../middleware/guardrails';

const router = express.Router();

/**
 * POST /api/transcript/review
 * Analyze conversation transcript with Reviewer agent
 */
router.post('/review', validateAgentResponse('reviewer'), async (req, res) => {
  try {
    const { transcript, protocolIds = ['basis-v1'], exerciseConfig } = req.body;

    // Validate input
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return res.status(400).json({
        error: 'INVALID_TRANSCRIPT',
        message: 'Transcript is required and must be a non-empty string'
      });
    }

    if (transcript.length > 50000) {
      return res.status(400).json({
        error: 'TRANSCRIPT_TOO_LARGE',
        message: 'Transcript exceeds maximum length of 50,000 characters'
      });
    }

    // Create Reviewer agent
    const reviewerAgent = createAgent('reviewer');

    // Analyze transcript
    const startTime = Date.now();
    const analysis = await reviewerAgent.analyzeTranscript(
      protocolIds,
      transcript,
      exerciseConfig
    );
    const analysisTime = Date.now() - startTime;

    // Calculate transcript metadata
    const wordCount = transcript.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedDuration = Math.ceil(wordCount / 150); // Assuming 150 words per minute speaking rate

    logger.info('Transcript analysis completed', {
      wordCount,
      estimatedDuration,
      analysisTime,
      protocolIds,
      rubricScores: analysis.rubric_summary.map(r => `${r.field}:${r.score}`).join(', ')
    });

    res.json({
      analysis: {
        reviewer: analysis
      },
      metadata: {
        wordCount,
        estimatedDuration,
        analysisTimestamp: new Date(),
        analysisTime,
        protocolsUsed: protocolIds
      }
    });

  } catch (error) {
    logger.error('Transcript analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      transcriptLength: req.body.transcript?.length || 0
    });

    // Determine error type for better user feedback
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(500).json({
          error: 'API_CONFIGURATION_ERROR',
          message: 'OpenAI API configuration issue. Please check API key.'
        });
      }
      
      if (error.message.includes('guardrail')) {
        return res.status(422).json({
          error: 'ANALYSIS_QUALITY_ERROR',
          message: 'Analysis did not meet quality standards. Please try again.'
        });
      }

      if (error.message.includes('timeout')) {
        return res.status(408).json({
          error: 'ANALYSIS_TIMEOUT',
          message: 'Analysis took too long. Please try with a shorter transcript.'
        });
      }
    }

    res.status(500).json({
      error: 'TRANSCRIPT_ANALYSIS_FAILED',
      message: 'Failed to analyze conversation transcript'
    });
  }
});

/**
 * POST /api/transcript/batch-review
 * Analyze multiple transcripts (for research/batch processing)
 */
router.post('/batch-review', async (req, res) => {
  try {
    const { transcripts, protocolIds = ['basis-v1'] } = req.body;

    if (!Array.isArray(transcripts) || transcripts.length === 0) {
      return res.status(400).json({
        error: 'INVALID_BATCH_INPUT',
        message: 'Transcripts must be a non-empty array'
      });
    }

    if (transcripts.length > 10) {
      return res.status(400).json({
        error: 'BATCH_TOO_LARGE',
        message: 'Maximum 10 transcripts per batch request'
      });
    }

    const reviewerAgent = createAgent('reviewer');
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < transcripts.length; i++) {
      const transcript = transcripts[i];
      
      if (typeof transcript !== 'string' || transcript.trim().length === 0) {
        results.push({
          index: i,
          error: 'INVALID_TRANSCRIPT',
          message: 'Transcript must be a non-empty string'
        });
        continue;
      }

      try {
        const analysis = await reviewerAgent.analyzeTranscript(protocolIds, transcript);
        const wordCount = transcript.split(/\s+/).length;
        
        results.push({
          index: i,
          analysis: { reviewer: analysis },
          metadata: {
            wordCount,
            estimatedDuration: Math.ceil(wordCount / 150)
          }
        });

      } catch (error) {
        results.push({
          index: i,
          error: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => !r.error).length;

    logger.info('Batch transcript analysis completed', {
      totalTranscripts: transcripts.length,
      successCount,
      totalTime,
      protocolIds
    });

    res.json({
      results,
      summary: {
        total: transcripts.length,
        successful: successCount,
        failed: transcripts.length - successCount,
        totalTime,
        protocolsUsed: protocolIds
      }
    });

  } catch (error) {
    logger.error('Batch transcript analysis failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'BATCH_ANALYSIS_FAILED',
      message: 'Failed to process batch transcript analysis'
    });
  }
});

export { router as transcriptRoutes };