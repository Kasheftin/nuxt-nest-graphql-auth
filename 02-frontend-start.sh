#!/bin/sh

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

cd "$SCRIPTPATH/frontend"
npm install
npm run build
pm2 stop nuxt-nest-graphql-auth-frontend
pm2 delete nuxt-nest-graphql-auth-frontend
pm2 start npm --name "nuxt-nest-graphql-auth-frontend" -e "/home/logs/nuxt-nest-graphql-auth/frontend.pm2.error.log" -- run start 

