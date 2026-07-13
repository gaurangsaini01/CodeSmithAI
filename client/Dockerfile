FROM node:22

WORKDIR /client

COPY package*.json .

RUN npm ci 

COPY . .

CMD ["npm","run","dev"]

EXPOSE 5180