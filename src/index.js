import dotenv from 'dotenv'; dotenv.config()
import { io, server, get_data, start_scan } from './lib'

const { EXPRESS_PORT } = process.env

io.on('connection', socket => {
    socket.emit('database', get_data())
    socket.on('refresh', () => {
        start_scan()
            .then(get_data())
            .then(() => {
                socket.emit('database', get_data())
            })
    })
})

server.listen(EXPRESS_PORT)
