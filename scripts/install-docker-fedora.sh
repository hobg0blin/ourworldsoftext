#!/bin/bash
# Install Docker CE + compose plugin on Fedora and add current user to the docker group.
set -euo pipefail

sudo dnf -y install dnf-plugins-core
sudo dnf config-manager addrepo --overwrite \
  --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo
echo "Docker installed. Log out and back in (or run: newgrp docker) to use it without sudo."
echo "Then: docker compose up -d   (from the project root)"
