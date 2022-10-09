#!/bin/sh

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

cd "$SCRIPTPATH/backend"
npm install
npm run build
pm2 stop nuxt-nest-graphql-auth-backend
pm2 delete nuxt-nest-graphql-auth-backend
pm2 start npm -n "nuxt-nest-graphql-auth-backend" -e "/home/logs/nuxt-nest-graphql-auth/backend.pm2.error.log" -- run start:prod

