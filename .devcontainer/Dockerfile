
# Start from a minimal Debian-based image
FROM mcr.microsoft.com/devcontainers/base:bullseye


# Install unzip, curl, Node.js (LTS) och npm
RUN apt-get update \
	&& apt-get install -y --no-install-recommends unzip curl ca-certificates gnupg \
	&& curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
	&& apt-get install -y --no-install-recommends nodejs \
	&& rm -rf /var/lib/apt/lists/*


# Install Bun
RUN curl -fsSL https://bun.sh/install | bash \
	&& mv /root/.bun/bin/bun /usr/local/bin/bun



# Install latest Supabase CLI (glibc-binary)
RUN SUPABASE_VERSION=$(curl -s https://api.github.com/repos/supabase/cli/releases/latest | grep 'tag_name' | cut -d\" -f4) \
	&& curl -L https://github.com/supabase/cli/releases/download/${SUPABASE_VERSION}/supabase-cli-linux-x64 -o /usr/local/bin/supabase \
	&& chmod +x /usr/local/bin/supabase \
	&& supabase --version

# Set default shell
SHELL ["/bin/bash", "-c"]
