FROM node:20

WORKDIR /app

# Install Encore CLI
RUN curl -L https://encore.dev/install.sh | bash

# Check Encore CLI installation
RUN /root/.encore/bin/encore version
RUN ls -la /root/.encore/bin/

CMD ["bash"]
