FROM node:16-alpine

ENV TZ='Europe/Rome'

WORKDIR /app

COPY  . .

RUN npm install

CMD node index.js

# docker build -t registry:5000/pettine-import . ;      docker push  registry:5000/pettine-import
