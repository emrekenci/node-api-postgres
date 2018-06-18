FROM node:carbon

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm install

# If you are building your code for production
RUN npm install --only=production

# Bundle app source
COPY . .

# Expose port 5001
EXPOSE 5001

# "npm start" command runs server.js
CMD [ "npm", "start" ]