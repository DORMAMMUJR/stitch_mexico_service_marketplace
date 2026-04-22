import { defineConfig } from '@prisma/config'

export default defineConfig({
  earlyAccess: true,
  migrations: {
    connectionUrl: process.env.DATABASE_URL,
  },
})
