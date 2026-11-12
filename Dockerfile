# syntax=docker/dockerfile:1
#
# Imagen de Golden Screen. Etapas:
#   dev   → entorno de desarrollo (docker-compose.yml), el código se monta como volumen.
#   build → compila el front-end (React + Vite).
#   prod  → imagen de producción: la API de Express sirve la API y el front compilado
#           desde el mismo origen (la sesión usa una cookie del propio sitio).

FROM node:24-alpine AS base
WORKDIR /app
# Hora del cine. Node trae los datos de zonas horarias incluidos.
ENV TZ=America/Argentina/Buenos_Aires
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/

# Desarrollo: el comando de cada servicio se define en docker-compose.yml.
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3001 5173

FROM base AS build
RUN npm ci
COPY client client
RUN npm run build -w client

# Producción: solo dependencias de ejecución del servidor y usuario sin privilegios.
FROM base AS prod
ENV NODE_ENV=production \
    PORT=3001
RUN npm ci --omit=dev --workspace server --include-workspace-root=false && npm cache clean --force
COPY server/src server/src
COPY server/database server/database
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/salud" || exit 1
WORKDIR /app/server
CMD ["node", "src/index.js"]
