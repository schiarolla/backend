import http from 'http'
import socket from 'socket.io'

const server = http.createServer()
const io = new socket.Server(server, { cors: { origin: '*' } })

export { io, server }
