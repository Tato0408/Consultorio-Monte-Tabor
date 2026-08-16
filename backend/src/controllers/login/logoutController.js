const logoutController = {};

logoutController.logout = (req, res) => {
    res.clearCookie("authCookie" , {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    return res.status(200).json({message: "Logout exitoso"});
};

export default logoutController;