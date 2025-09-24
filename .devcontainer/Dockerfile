# Devcontainer: Debian Bullseye base with Bun and Supabase CLI
FROM mcr.microsoft.com/devcontainers/base:bullseye

# Install basic packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    ca-certificates \
    gnupg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (official installer)
RUN curl -fsSL https://bun.sh/install | bash && mv /root/.bun/bin/bun /usr/local/bin/bun

# Install Supabase CLI (download latest known stable tarball and install binary)
ARG SUPABASE_VERSION=v2.45.5
RUN set -euo pipefail \
    && TMPDIR=$(mktemp -d) \
    && wget -q -O "$TMPDIR/supabase.tar.gz" "https://github.com/supabase/cli/releases/download/${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz" \
    && tar -xzf "$TMPDIR/supabase.tar.gz" -C "$TMPDIR" \
    && BINARY=$(find "$TMPDIR" -type f -name 'supabase' -print -quit) \
    && chmod +x "$BINARY" \
    && mv "$BINARY" /usr/local/bin/supabase \
    && chmod +x /usr/local/bin/supabase \
    && rm -rf "$TMPDIR"

# Set bash as default shell
SHELL ["/bin/bash", "-c"]

# Verify supabase is available (during build) - prints version
RUN supabase --version || true
