const express = require('express')
const bcrypt = require('bcryptjs')

const router = express.Router()

const User = require('../models/User')

router.post('/register', async (req, res) => {
    try {

        const { email, name, password } = req.body

        if (!email || !name || !password) throw 'Dados insuficientes'
        if (!email.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/)) throw 'Email inválido'
        if (password.length < 6) throw 'Senha deve ter pelo menos 6 caracteres'
        if (name.length < 3) throw 'Nome deve ter pelo menos 3 caracteres'
        if (name.match(/[0-9]/)) throw 'Nome não pode ter números'

        const emailExists = await User.findOne({ email })
        if (emailExists) throw 'Email já cadastrado'

        // senha criptografada
        const passwordHash = await bcrypt.hash(password, 10)

        const user = await User.create({
            email,
            name,
            password: passwordHash
        })
        
        if (!user) throw 'Erro ao criar usuário'

        res.status(201).json({ ok: 'ok', message: 'Usuário criado com sucesso'})        

    } catch (err) {
        return res.status(400).send({ error: 'Falha no registro', message: err })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) throw 'Dados insuficientes'
        if (!email.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/)) throw 'Informações inválidas'
        if (password.length < 6) throw 'Senha deve ter pelo menos 6 caracteres'

        const user = await User.findOne({ email }).select('+password')
        if (!user) throw 'Informações inválidas'

        if (!await bcrypt.compare(password, user.password)) throw 'Informações inválidas'

        res.status(200).json({ ok: 'ok', message: 'Usuário logado com sucesso'})
    } catch (err) {
        return res.status(400).send({ error: 'Falha na autenticação', message: err })
    }
})

module.exports = router