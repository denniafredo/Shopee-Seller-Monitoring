import express from 'express'
import cors from 'cors'
import shopeeOrderRoutes from './routes/shopeeOrder.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    message: 'Shopee Dashboard API Direct is running',
    database: false
  })
})

app.use('/api/shopee', shopeeOrderRoutes)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

app.use((error, req, res, next) => {
  console.error(error)

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    shopeeError: error.data || undefined
  })
})

export default app
