const logoutController = {};

logoutController.logout = (req, res) => {
    res.clearCookie("authCookie");
    return res.status(200).json({message: "Logout exitoso"});
};

export default logoutController;