FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies including devDependencies (needed for build)
RUN npm install --include=dev

COPY . .

# Accept build arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Copy static assets to standalone directory (required for standalone output)
RUN cp -r .next/static .next/standalone/.next/static && \
    if [ -d "public" ]; then cp -r public .next/standalone/public; fi

# Set production environment
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

EXPOSE 3000

# Use standalone server (required for output: standalone)
CMD ["node", ".next/standalone/server.js"]
