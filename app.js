const express = require('express')
const mongoose = require('mongoose')
const UserRoutes = require('./src/routes/user')

const app = express()
app.use(express.json());
require('dotenv').config()

const APP_PORT = process.env.PORT || 8080
const APP_URL = process.env.URL || `http://localhost:${APP_PORT}`

// Mongoose
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.info('Conectado ao banco de dados!'))
    .catch((err) => console.info('Erro ao conectar ao banco de dados: ' + err))

// Rotas
app.use('/', UserRoutes)

app.get('/', (req, res) => res.json({ message: 'Hello World!' }))

app.listen(APP_PORT, () => console.info(`Servidor rodando em ${APP_URL}`))

module.exports = app