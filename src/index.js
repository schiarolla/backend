import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'; dotenv.config()
import { scan_bmc, get_bmc } from './utility'

const { EXPRESS_PORT } = process.env

const server = express()

server.use(cors())
server.use(helmet())
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.post('/bmc', scan_bmc)
server.get('/bmc', get_bmc)

server.listen(EXPRESS_PORT, '0.0.0.0')
