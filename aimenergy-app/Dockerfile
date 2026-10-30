FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
WORKDIR /app
# Copy only the runtime and curated public assets, never source Data or Models.
COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node dist ./dist
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
