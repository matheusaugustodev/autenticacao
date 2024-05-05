const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose')
const dotenv = require('dotenv');
const passport = require('passport');

const adminRouter = require('./routes/admin.js');
const userRouter = require('./routes/user.js');
const configurePassport = require('./config/auth.js');
const Message = require('./models/message.js')

const app = express()

const http = require('http')
const socketIo = require('socket.io')
const server = http.createServer(app)

const io = socketIo(server)

const APP_PORT = process.env.PORT || 8080
const APP_URL = process.env.URL || `http://localhost:${APP_PORT}`
// Configurações

let userLogged = ''
let socketsConnected = []
let usersConnected = []

// Dotenv
  dotenv.config()

// Passport
  configurePassport(passport)

// Mongoose
  mongoose
    .connect(
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@blogapp.sw6jpom.mongodb.net/blogapp`
    )
    .then(() => console.log('Conectado ao banco de dados!'))
    .catch((err) =>
      console.log('Erro ao conectar ao banco de dados: ' + err)
    )

// Email
      
  // let transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: process.env.EMAIL,
  //     pass: process.env.EMAIL_PASSWORD
  //   }
  // })

  const mailOptions = {
    from: "Matheus Augusto <matheus44medeiros44@gmail.com>",
    to: "matheus4medeiros4@gmail.com",
    subject: "Assunto do email",
    text: "Conteúdo do email em formato de texto",
    // Você também pode usar a propriedade "html" para enviar email em formato HTML.
    // html: "<h1>Conteúdo do email em formato HTML</h1>"
  }
  
  // transporter.sendMail(mailOptions, (error, info) => {
  //   if (error) {
  //     console.error("Erro ao enviar o email:", error);
  //   } else {
  //     console.log("Email enviado com sucesso:", info.response);
  //   }
  // });


// Sessão
app.use(
  session({
    secret: 'curso',
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize())
app.use(passport.session())

  // Middleware
    app.use((req, res, next) => {
      // global variables
      res.locals.logged = req.user || null;
      res.locals.loggedAdmin = (req.user && req.user.isAdmin) || false;
      res.locals.APP_URL = APP_PORT
      userLogged = req.user || null

      if (!req.user) {
        return next();
      }
    
      req.user.lastActivity = new Date();
      req.user.save();

      next();
    });


app.use(express.json());

// Public
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/', adminRouter)
app.use('/', userRouter)


server.listen(APP_PORT, () => {
  console.log(`Servidor rodando na porta ${APP_PORT}`)
});


io.on('connection', (socket) => {

  if(!userLogged || !usersConnected.every(user => user._id != userLogged._id)) return

  socketsConnected.push(socket)
  const { _id, name, email } = userLogged
  usersConnected.push({_id, name, email, socketid: socket.id})
  updateUser()

  socket.on('loadChat', ({from, to}) => {
    
    loadingChat(from, to)

  })

  socket.on('sendTempMessage', (info) => {

    const toSocketUser = usersConnected.filter(item => item._id == info.to)[0]
    const toSocket = socketsConnected.filter(item => item.id == toSocketUser.socketid)[0]

    const fromUserName = usersConnected.filter(item => item._id == info.from)[0].name

    toSocket.emit('loadTempMessage', {fromName: fromUserName, fromId: info.from, message: info.message})
  })

  socket.on('sendMessage', (info) => {
    const userTo = info.to
    const userFrom = info.from
    const message = info.message
    console.log(info)
    
    dbSendMessage(userFrom, userTo, message)
  })

  socket.on('disconnect', () => {
    usersConnected = usersConnected.filter(item => item.socketid != socket.id)
    socketsConnected = socketsConnected.filter(item => item.id != socket.id)
    updateUser()
  })
})

function dbSendMessage(from, to, message) {
  const newMessage = new Message({
    from,
    to,
    message,
    date: Date.now()
  })
  newMessage.save()
    .then(() => {

      // toSocket.emit('loadMessage', {from, to, message})

      const toSocketUser = usersConnected.filter(item => item._id == to)[0]
      const toSocket = socketsConnected.filter(item => item.id == toSocketUser.socketid)[0]
      const fromName = usersConnected.filter(item => item._id == from)[0].name

      loadingChat(to, from)

      // Message.find({from, to}).then((messages) => {
      //   // toSocket.emit('loadMessage', messages)
      //   console.log('emitmessage')
      // })
      // .catch((error) => console.log('Error search messages: ', error))
    
    })
    .catch((erro) => {
      console.log('Error to save message on DB: ' + erro)
    })
}

function loadingChat(from, to) {

  Message.find({
    from: { $in: [from, to] },
    to: { $in: [from, to] }
  })
    .sort({ date: 1 })
    .then((result) => {

      const fromSocketUser = usersConnected.filter(item => item._id == from)[0]
      const fromSocket = socketsConnected.filter(item => item.id == fromSocketUser.socketid)[0]

      result = result.map(message => {
        return {
          from: message.from, to: message.to, date: message.date, message: message.message
        }
      })
      fromSocket.emit('sendLoadChat', result)
    })
}

function updateUser() {
  const listUser = usersConnected.map(item => {
    return {
      name: item.name,
      _id:  item._id,
    }
  })

  // socketsConnected.forEach(socket => {
  //   socket.emit('updateUser', listUser)
  // })
}