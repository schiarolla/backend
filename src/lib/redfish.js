import axios from 'axios'
import https from 'https'
import dotenv from 'dotenv'
import { start_scan } from './'

dotenv.config()

const { BMC_USERNAME, BMC_PASSWORD } = process.env

const imageHPEServer = async request => {

    const getStatus = async () => {
        let { data: { Status: { State }, UUID } } = await request.get('redfish/v1/systems/1/')
        let { data: { Inserted, Oem: { Hp: { BootOnNextServerReset } } } } = await request.get('redfish/v1/managers/1/virtualmedia/2')
        return { state: State, inserted: Inserted, bootToImage: BootOnNextServerReset, guid: UUID }
    }

    let status = await getStatus()

    if (status.state !== 'Starting') {
        if (status.inserted) {
            let action = { Action: "EjectVirtualMedia", Target: "/Oem/Hp" }
            await request.post('redfish/v1/managers/1/virtualmedia/2', action)
        }
        status = await getStatus()
        if (!status.inserted) {
            let action = { Action: "InsertVirtualMedia", Target: "/Oem/Hp", Image: "http://172.22.1.81:4000/image/boot.iso" }
            await request.post('redfish/v1/managers/1/virtualmedia/2', action)
        }
        status = await getStatus()
        if (!status.bootToImage) {
            let action = { Oem: { Hp: { BootOnNextServerReset: true } } }
            await request.patch('redfish/v1/managers/1/virtualmedia/2', action)
        }
        status = await getStatus()
        if (status.state === 'Disabled' && status.inserted && status.bootToImage) {
            let action = { ResetType: "On" }
            request.post('redfish/v1/systems/1/actions/computersystem.reset', action)

        } else if (status.state !== 'Starting' && status.inserted && status.bootToImage) {
            let action = { ResetType: "ForceRestart" }
            request.post('redfish/v1/systems/1/actions/computersystem.reset', action)
        }
    }
    return status
}

const imageServer2 = async hostname => {
    let request = axios.create({ baseURL: `https://${BMC_USERNAME}:${BMC_PASSWORD}@${hostname}`, httpsAgent: new https.Agent({ rejectUnauthorized: false }) })
    try {
        let { data: { Members: [systems] } } = await request.get('redfish/v1/Systems/')
        let { data: { Manufacturer } } = await request.get(systems['@odata.id'])
        switch (Manufacturer) {
            case 'HPE': return imageHPEServer(request)
            case 'HP': return imageHPEServer(request)
            case 'Lenovo': return 'lenovo'
            case 'Dell Inc.': return 'dell'
        }
    } catch (error) {
        throw new Error(error)
    }
}

const power_on_hpe = server => {
    return axios.post(`https://${BMC_USERNAME}:${BMC_PASSWORD}@${server.ip}/redfish/v1/systems/1/actions/computersystem.reset`, { ResetType: "On" })
        .catch(error => error.message)
}


export const power_on = server => {
    switch (server.manufacturer) {
        case 'hpe': return power_on_hpe(server)
        case 'hp': return power_on_hpe(server)
        case 'lenovo': return 'lenovo'
        case 'Dell Inc.': return 'dell'
    }
}

export const power_off = async server => {
    console.log(server)
}
