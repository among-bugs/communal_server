const fileService = require('../services/fileService')
const config = require('config')
const fs = require('fs')
const User = require('../models/User')
const File = require('../models/File')
const News = require('../models/News')
const Service = require('../models/Service')
const Uuid = require('uuid')
const mongoose = require('mongoose')
const bcrypt = require("bcryptjs")

class FileController {
    async createDir(req, res) {
        try {
            const {name, type, parent} = req.body
            const file = new File({name, type, parent, user: req.user.id})
            const parentFile = await File.findOne({_id: parent})
            if(!parentFile) {
                file.path = name
                await fileService.createDir(file)
            } else {
                file.path = `${parentFile.path}/${file.name}`
                await fileService.createDir(file)
                parentFile.childs.push(file._id)
                await parentFile.save()
            }
            await file.save()
            return res.json(file)
        } catch (e) {
            console.log(e)
            return res.status(400).json(e)
        }
    }

    async getFiles(req, res) {
        try {
            const {sort} = req.query
            console.log(sort)

            let files
            switch (sort) {
                case 'name':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({name:1})
                    break
                case 'type':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({type:1})
                    break
                case 'date':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({date:1})
                    break
                default:
                    files = await File.find({user: req.user.id, parent: req.query.parent})
                    break;
            }
            return res.json(files)

        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Can not get files"})
        }
    }

    async uploadFile(req, res) {
        try {
            const file = req.files.file

            const parent = await File.findOne({user: req.user.id, _id: req.body.parent})
            const user = await User.findOne({_id: req.user.id})

            if (user.usedSpace + file.size > user.diskSpace) {
                return res.status(400).json({message: 'There no space on the disk'})
            }

            user.usedSpace = user.usedSpace + file.size

            let path;
            if (parent) {
                path = `${config.get('filePath')}/${user._id}\\${parent.path}\\${file.name}`
            } else {
                path = `${config.get('filePath')}/${user._id}\\${file.name}`
            }

            if (fs.existsSync(path)) {
                return res.status(400).json({message: 'File already exist'})
            }
            file.mv(path)

            const type = file.name.split('.').pop()
            let filePath = file.name
            if (parent) {
                filePath = parent.path + "\\" + file.name
            }
            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: filePath,
                parent: parent?._id,
                user: user._id
            });

            await dbFile.save()
            await user.save()

            res.json(dbFile)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Upload error"})
        }
    }

    async downloadFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
                
            const path = fileService.getPath(file)
            // config.get('filePath') + '/' + req.user.id + '/' + file.path + '/' + file.name
            if (fs.existsSync(path)) {
                return res.download(path, file.name)
            }
            return res.status(400).json({message: "Download error"})
        } catch (e) {
            console.log(e)
            res.status(500).json({message: "Download error"})
        }
    }

    async deleteFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
            console.log(req.query.id)
            if (!file) {
                return res.status(400).json({message: 'Файл жүйеде табылмады!'})
            }
            fileService.deleteFile(file)
            await file.remove()
            return res.json({message: 'Таңдалған файл немесе директория сәтті өшірілді!'})
        } catch (e) {
            console.log(e)
            return res.status(400).json({message: 'Директория іші бос емес!'})
        }
    }

    async uploadAvatar(req, res) {
        try {
            const file = req.files.file
            const user = await User.findById(req.user.id)
            const avatarName = Uuid.v4() + '.jpg'
            file.mv(config.get('staticPath') + '\\' + avatarName)
            user.avatar = avatarName
            await user.save()
            return res.json(user)
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Қолданушы аватары дұрыс көшірілмеді!'})
        }
    }

    async deleteAvatar(req, res) {
        try {
            const user = await User.findById(req.user.id)
            fs.unlinkSync(config.get('staticPath') + '\\' + user.avatar)
            user.avatar = null

            await user.save()
            return res.json(user)
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Қолданушы аватары дұрыс өшірілмеді!'})
        }
    }

    async deleteNews(req, res) {
        const { id } = req.query
        try {
            await News.findByIdAndDelete(id)
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Ағымдағы жаңалық дұрыс өшірілмеді!'})
        }
        
    }

    async getUsers(req, res) {
        try {
            const users = await User.find({})
            return res.json(users)

        } catch(e) {
            return res.status(400).json({message: 'All users error!'})
        }
    }

    async getTopEmployee(req, res) {
        try {
            const topemployee = await User.find({status: 'employee'}).limit(1)
            return res.json(topemployee)
        } catch(e) {
            return res.status(400).json({message: 'Top Employee!'})
        }
    }

    async setStatus(req, res) {
        
        try {
            const { fullname, status } = req.body
            const user = await User.findOne({fullname: fullname}) //, { $set: {status: status}}, { upsert: true }
            user.status = status

            if (status == 'moderator') {
                user.service = 'Веб-қосымша модераторы'
            }

            if (status == 'admin') {
                user.service = 'Веб-қосышма администраторы'
            }

            await user.save()
            return res.status(200).json({message: `Қолданушы статусы сәтті өзгерді!`})
        } catch(e) {
            return res.status(400).json({message: `Қолданушы статусы өзгеруде қате шықты!`})
        }
    }

    async getNews(req, res) {
        try {
            const news = await News.find({})
            return res.json(news)
        } catch(e) {
            return res.status(400).json({message: 'News error!'})
        }
    }

    async addingNews(req, res) {
        try {
            const {
                title,
                date,
                content
            } = req.body
            const news = new News({
                title: title,
                date: date,
                content: content
            })
            await news.save()
            return res.json(news)
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: "Жаңалық дұрыс көшірілмеді!"})
        }
    }

    async deleteServices(req, res) {
        const { id } = req.query
        try {
            await Service.findByIdAndDelete(id)
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Ағымдағы сервис дұрыс өшірілмеді!'})
        }
    }

    async deleteUsers(req, res) {
        const { id } = req.query
        try {
            await User.findByIdAndDelete(id)
            return res.status(400).json({message: 'Ағымдағы қолданушы сәтті өшірілді!'})
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Ағымдағы қолданушы дұрыс өшірілмеді!'})
        }
        
    }

    async getServices(req, res) {
        try {
            const services = await Service.find({})
            return res.json(services)
        } catch(e) {
            return res.status(400).json({message: 'Services error!'})
        }
    }

    async addingServices(req, res) {
        try {
            const {
                name,
                phone,
                email,
                price,
                image
            } = req.body
            const services = new Service({
                name: name,
                phone: phone,
                email: email,
                price: price,
                image: image
            })
            await services.save()
            return res.json(services)
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: "Сервис дұрыс көшірілмеді!"})
        }
    }


    async setUserProfile(req, res) {
        try {
             const {
                fullname,
                phone,
                region,
                city,
                street,
                factura
            } = req.body

            const user = await User.findById(req.user.id)

            user.fullname =  fullname
            user.phone =  phone
            user.region =  region
            user.city =   city
            user.street =  street
            user.factura =  factura

            await user.save()

            // return res.json(user)
            return res.status(400).json({message: 'Қолданушының жеке мәліметі сәтті жаңарды!'})
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Қолданушы аватары дұрыс көшірілмеді!'})
        }
    }

    async setEmployeeProfile(req, res) {
        try {
             const {
                fullname,
                phone,
                service
            } = req.body

            const user = await User.findById(req.user.id)

            user.fullname =  fullname
            user.phone =  phone
            user.service =  service

            await user.save()

            return res.status(400).json({message: 'Қызметкер мәліметі сәтті сақталды!'})
        } catch(err) {
            console.log(err)
            return res.status(400).json({message: 'Қолданушы аватары дұрыс көшірілмеді!'})
        }
    }
}

module.exports = new FileController()