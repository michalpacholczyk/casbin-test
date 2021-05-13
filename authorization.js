const casbin = require('casbin');
const uuid = require('uuid')

const enforcerPromise = casbin.newEnforcer('authorization/model.conf', 'authorization/policy.csv');

// This custom function policy matcher is performed as the last one (see model.conf, matcher section)
// However, call to session service will be performed for every matching policy with concurrency != 'inf' (see console output)
// The cache for request should be implemented for storing "checkConcurrencySessionNumber" results while policies are evaluated
async function checkConcurrencyLimit(concurrencyLimit, subject, sub_rule) {
    if (concurrencyLimit === 'inf') {
        return true
    }
    console.log("Checking concurrency limit for sub-role: \"" + sub_rule + "\" with concurrency limit: " + concurrencyLimit);
    const concurrentSessionNo = await mockSessionService.checkConcurrentSessionNumber(subject.sub);
    return concurrencyLimit >= concurrentSessionNo;
}

async function enforce(sub, channel, quality, act) {
    const e = await enforcerPromise;
    await e.addFunction("checkConcurrencyLimit", await checkConcurrencyLimit) // Add custom function policy matcher
    return await e.enforce(sub, channel, quality, act);  // Perform policies evaluation
}

// Authorization middleware
async function authorize(req, res, next) {
    // JWT token decoding omitted, use plain, one-line JSON in Authorization header
    const token = req.headers['authorization'];
    const decoded = JSON.parse(token);

    try {
        const pass = await enforce(decoded, req.params.channelId, req.params.quality, req.params.action);
        if (pass) {
            next();
        } else {
            res.status(403).json({message: 'Forbidden!'});
        }
    } catch (err) {
        console.log(err);
        throw err;
    }
}

module.exports = {
    authorize
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////

const mockSessionService = {
    mockConcurrentSessionNumber: 2,
    async checkConcurrentSessionNumber(subId) {
        const checkConcurrentSessionNumberInternal = new Promise((resolve) => {
            setTimeout(() => resolve(this.mockConcurrentSessionNumber), 250) // mimics Session service response delay
        });
        return await checkConcurrentSessionNumberInternal;
    }
}