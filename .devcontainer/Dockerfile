
# Start from a minimal Debian-based image
FROM mcr.microsoft.com/devcontainers/base:bullseye

# Install unzip and curl
RUN apt-get update \
	&& apt-get install -y --no-install-recommends unzip curl \
	&& rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash \
	&& mv /root/.bun/bin/bun /usr/local/bin/bun

# Install latest Supabase CLI
RUN curl -sL https://github.com/supabase/cli/releases/latest/download/supabase-cli-linux-x64 -o /usr/local/bin/supabase \
	&& chmod +x /usr/local/bin/supabase

# Set default shell
SHELL ["/bin/bash", "-c"]
