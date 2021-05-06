import dotenv from 'dotenv'; dotenv.config()
import { io, server, get_data, start_scan, power_on } from './lib'

const { EXPRESS_PORT } = process.env

start_scan()

io.on('connection', socket => {

    socket.emit('database', get_data())

    socket.on('poweron', server => {
        power_on(server).then(start_scan).then(() => socket.emit('database', get_data()))
    })

    socket.on('poweroff', server => {
        console.log('poweroff', server)
    })
})

server.listen(EXPRESS_PORT)
