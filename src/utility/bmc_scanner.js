import evilscan from 'evilscan'
import axios from 'axios'
import https from 'https'
import dotenv from 'dotenv'; dotenv.config()
import { db, networks } from './bmc_networks'

const { BMC_USERNAME, BMC_PASSWORD } = process.env

var scan_results, redfish_results

const update_database = () => {
    db.remove({})
    db.insert(redfish_results, (err, doc) => err ? console.log(err.message) : console.log(doc))
}

const scan_redfish = () => {
    redfish_results = []
    return Promise.all(scan_results.map(scan => {
        const request = axios.create({
            baseURL: `https://${BMC_USERNAME}:${BMC_PASSWORD}@${scan.ip}`,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
        return request.get(`redfish/v1/Systems/`)
            .then(response => response.data.Members[0]['@odata.id'])
            .then(request.get)
            .then(response => {
                return {
                    building: scan.building.toLowerCase().trim() || '',
                    room: scan.room.toLowerCase().trim() || '',
                    rack: scan.rack.toLowerCase().trim() || '',
                    hostname: response.data.HostName.toLowerCase().trim() || '',
                    ip: scan.ip || '',
                    health: response.data.Status.Health.toLowerCase().trim() || '',
                    manufacturer: response.data.Manufacturer.toLowerCase().trim() || '',
                    model: response.data.Model.toLowerCase().trim() || '',
                    cpu_model: response.data.ProcessorSummary.Model.toLowerCase().trim() || '',
                    cpu_count: response.data.ProcessorSummary.Count || '',
                    memory: response.data.MemorySummary.TotalSystemMemoryGiB || '',
                    guid: response.data.UUID.toLowerCase().trim() || '',
                    asset_tag: response.data.AssetTag.toLowerCase().trim() || '',
                    serial_number: response.data.SerialNumber.toLowerCase().trim() || '',
                    power: response.data.PowerState.toLowerCase().trim() || '',
                }
            })
            .then(response => redfish_results.push(response))
            .catch(() => { })
    }))
}

const scan_network = () => {
    scan_results = []
    return Promise.all(networks.map(({ target, port, ...rest }) => {
        return new Promise(resolve => {
            new evilscan({ target, port, status: 'O', banner: false }, (err, scan) => {
                scan.on('result', result => scan_results.push({ ...result, ...rest }))
                scan.on('done', resolve)
            }).run()
        })
    }))
}

export const scan_bmc = (req, res) => {
    scan_network()
        .then(scan_redfish)
        .then(update_database)
        .then(() => db.find({}, (err, doc) => {
            err
                ? res.status(500).send(err.message)
                : res.status(200).send(doc)
        }))
}

export const get_bmc = (req, res) => {
    db.find({}, (err, doc) => {
        err
            ? res.status(500).send(err.message)
            : res.status(200).send(doc)
    })
}
