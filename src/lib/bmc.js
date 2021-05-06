import evilscan from 'evilscan'
import axios from 'axios'
import https from 'https'
import dotenv from 'dotenv'; dotenv.config()
import networks from './networks'

const { BMC_USERNAME, BMC_PASSWORD } = process.env

var inMemoryDB, scanResults

const scan_redfish = () => {
    inMemoryDB = []
    return Promise.all(scanResults.map(scan => {
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
            .then(response => inMemoryDB.push(response))
            .catch(() => { })
    }))
}

const scan_network = networks => {
    scanResults = []
    return Promise.all(networks.map(({ target, port, ...rest }) => {
        return new Promise(resolve => {
            new evilscan({ target, port, status: 'O', banner: false }, (err, scan) => {
                scan.on('result', result => scanResults.push({ ...result, ...rest }))
                scan.on('done', resolve)
            }).run()
        })
    }))
}

const get_data = () => {
    return inMemoryDB
}

const start_scan = () => {
    scan_network(networks)
        .then(scan_redfish)
}

export { get_data, start_scan }
