/**
 * TODO move this to a common npm module
 * currently it is in this project as it is being vetted
 */
const sampleLogger = {
    info: (..._args: unknown[]) => {},
    warn: (..._args: unknown[]) => {},
    error: (..._args: unknown[]) => {},
    debug: (..._args: unknown[]) => {}
};

const isLogger = (loggerCandidate: any): loggerCandidate is typeof sampleLogger  => {
    if (loggerCandidate === null || loggerCandidate === undefined) {
        return false;
    }

    const hasBadKey = Object.keys(sampleLogger).some(key => {
        if(typeof loggerCandidate[key] !== 'function') {
            return true;
        }
        return false;
    });
    return !hasBadKey;
}

let logger: typeof sampleLogger = (global as any).logger;
if (!isLogger(logger)) {
    logger = console;
}

export default logger;
