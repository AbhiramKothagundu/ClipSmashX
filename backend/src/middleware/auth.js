const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers["authorization"];
        if (token && token === process.env.API_TOKEN) {
            next();
        } else {
            // End the response more gracefully
            res.status(401)
                .json({
                    error: true,
                    message: "Unauthorized",
                })
                .end();
        }
    } catch (error) {
        res.status(500)
            .json({
                error: true,
                message: "Authentication error",
            })
            .end();
    }
};

module.exports = authMiddleware;
