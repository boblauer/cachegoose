declare module 'cachegoose' {
    import { DocumentQuery, Document, Mongoose } from 'mongoose'

    function cachegoose(mongoose: Mongoose, cacheOptions?: cachegoose.Types.IOptions): void

    namespace cachegoose {
        namespace Types {
            interface IOptions {
                engine?: string
                port?: number
                host?: string
            }
        }

        function clearCache(customKey: string, cb?: () => void): void
    }

    export = cachegoose
}
