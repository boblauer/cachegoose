import { Document, Mongoose } from 'mongoose';

declare module 'cachegoose' {

	function cachegoose(mongoose: Mongoose, cacheOptions: cachegoose.Types.IOptions): void;

	namespace cachegoose {
		namespace Types {
			interface IOptions {
				engine?: string
				port?: number
				host?: string
				password?: string,
				client?: any,
			}
		}

		function clearCache(customKey: any, cb: any): void;
	}

	export = cachegoose;
}

declare module 'mongoose' {
	// eslint-disable-next-line @typescript-eslint/class-name-casing
	interface DocumentQuery<T, DocType extends Document, QueryHelpers = {}> {
		// not cachegoose related fix, but usefull. thanks to https://github.com/DefinitelyTyped/DefinitelyTyped/issues/34205#issuecomment-621976826
		orFail(err?: Error | (() => Error)): DocumentQuery<NonNullable<T>, DocType, QueryHelpers>;
		cache(ttl: number = 60, customKey: string = ''): this
		cache(customKey: string = ''): this
		cache(ttl: number = 60): this
	}
}

