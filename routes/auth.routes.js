const Router = require("express");
const User = require("../models/User")
const bcrypt = require("bcryptjs")
const config = require("config")
const jwt = require("jsonwebtoken")
const {
    check,
    validationResult
} = require("express-validator")
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileService = require('../services/fileService')
const File = require('../models/File')

let currUserRequest = {}

router.post('/registration',
    [
        check('email', "Қате email").isEmail(),
        check('password', 'Құпия сөз з тен кем және 12 ден үлкен бомауы керек!').isLength({
            min: 3,
            max: 24
        })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Пошта немесе құпия сөз терілмеген!",
                    errors
                })
            }
            const {
                email,
                password,
                username
            } = req.body
            const candidate = await User.findOne({
                email
            })

            if (candidate) {
                return res.status(400).json({
                    message: `Қолданушы '${email}' желіде тіркелген!`
                })
            }

            const hashedEmail = await bcrypt.hash(email, 8)
            const hashedPassword = await bcrypt.hash(password, 8)
            const hashedUsername = await bcrypt.hash(username, 8)
            const user = new User({
                email: hashedEmail,
                password: hashedPassword,
                username: hashedUsername,
                status: 'Статус белгіленбеген!'
            })

            await user.save()
            
            await fileService.createDir(new File({
                user: user.id,
                name: ''
            }))

            res.json({
                message: "Қолданушы желіге сәтті тіркелді"
            })
        } catch (e) {
            console.log(e)
            res.send({
                message: "Серверден қате келді"
            })
        }
    })

    
router.post('/login',
    async (req, res) => {
        try {
            const {
                email,
                password
            } = req.body

            currUserRequest = {
                email: email
            }

            const users = await User.find({})

            for (let user of users) {

              const  decryptedUserEmail = bcrypt.compareSync(email, user.email)

                if (decryptedUserEmail) {
                    
                    if (!user) {
                        return res.status(404).json({
                            message: "Қолданушы желіде табылмады!"
                        })
                    }
        
                    const isPassValid = bcrypt.compareSync(password, user.password)

                    if (!isPassValid) {
                        return res.status(400).json({
                            message: "Қате құпия сөз!"
                        })
                    }
                    const token = jwt.sign({
                        id: user.id
                    }, config.get("secretKey"), {
                        expiresIn: "1h"
                    })
                    return res.json({
                        token,
                        user: {
                            id: user.id,
                            email: email,
                            avatar: user.avatar
                        }
                    })
                }
            }  
        } catch (e) {
            console.log(e)
            res.send({
                message: "Серверден қате жауап келді!"
            })
        }
    })


router.get('/auth', authMiddleware,
    async (req, res) => {
        try {

            const user = await User.findOne({
                _id: req.user.id
            })

            const token = jwt.sign({
                id: user.id
            }, config.get("secretKey"), {
                expiresIn: "1h"
            })
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.id,
                    username: user.username,
                    fullname: user.fullname,
                    phone: user.phone,
                    region: user.region,
                    city: user.city,
                    street: user.street,
                    factura: user.factura,
                    status: user.status,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({
                message: "Серверден қате жауап келді!"
            })
        }
    })


module.exports = router