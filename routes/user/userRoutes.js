const express = require("express");
const router = express.Router();
const loginModel = require("../../models/user/login");
const cookieAuth = require("../../utils/auth");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

//models
const feedbackModel = require("../../models/admin/feedback");
const productModel = require("../../models/admin/product");
const orderModel = require("../../models/user/order");

router.get("/login", async (req, res) => {
  if (req.cookies.user) {
    const id = jwt.verify(req.cookies.user, "sdfkjendfk");
    const findId = await loginModel.findByPk(id);
    if (findId) {
      res.redirect(`/user/${id}/dashboard`);
    } else {
      res.clearCookie("user");
      res.render("user/login", { wrong: "", emailExist: true });
    }
  } else {
    res.render("user/login", { wrong: "", emailExist: true });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const checkData = await loginModel.findOne({
    where: {
      email: email,
    },
  });

  if (checkData) {
    if (password == checkData.dataValues.password) {
      const token = cookieAuth(checkData.dataValues.id);
      res.cookie("user", token, {
        expires: new Date(Date.now() + 172800 * 1000),
        secure: true,
        httpOnly: true,
      });

      res.redirect(`/user/${checkData.dataValues.id}/dashboard`);
    } else {
      res.render("user/login", { wrong: "Wrong password", emailExist: true });
    }
  } else {
    res.render("user/login", { wrong: "", emailExist: false });
  }
});

router.get("/signup", async (req, res) => {
  if (req.cookies.user) {
    const id = jwt.verify(req.cookies.user, "sdfkjendfk");
    const findId = await loginModel.findByPk(id);
    if (findId) {
      res.redirect(`/user/${id}/dashboard`);
    } else {
      res.clearCookie("user");
      res.render("user/signup", { exist: false, wrongPassword: false });
    }
  } else {
    res.render("user/signup", { exist: false, wrongPassword: false });
  }
});

router.post("/signup", async (req, res) => {
  const { name, email, password, confirm, address, pincode, phone } = req.body;

  const result = await loginModel.findOne({
    where: {
      email: email,
    },
  });

  if (password !== confirm) {
    res.render("user/signup", { exist: false, wrongPassword: true });
  } else {
    if (result) {
      res.render("user/signup", { exist: true, wrongPassword: false });
    } else {
      const storeData = await loginModel
        .create({
          email: email,
          password: password,
          name: name,
          address: address,
          pincode: pincode,
          phone: phone,
        })
        .then((data) => {
          const token = cookieAuth(data.dataValues.id);
          res.cookie("user", token, {
            expires: new Date(Date.now() + 172800 * 1000),
            secure: true,
            httpOnly: true,
          });
          console.log(data.dataValues);
          console.log("Store data successfully");
          res.redirect(`/user/${data.dataValues.id}/dashboard`);
        })
        .catch((err) => {
          res.json({ err: err.message });
        });
    }
  }
});

router.get("/:id/dashboard", async (req, res) => {
  const { id } = req.params;
  const { query } = req.query;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);

    if (findId) {
      if (query) {
        const products = await productModel
          .findAll({
            where: {
              name: {
                [Op.iLike]: `%${query}%`,
              },
            },
          })
          .then((data) => {
            res.render("user/dashboard", { id: id, products: data });
          });
      } else {
        const products = await productModel.findAll({});
        res.render("user/dashboard", { id: id, products: products });
      }
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.get("/:id/dashboard/orders", async (req, res) => {
  const { id } = req.params;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    if (findId) {
      const orders = await orderModel.findAll({
        where: {
          customerid: findId.dataValues.id,
        },
      });
      res.render("user/orders", { id: id, orders: orders });
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.get("/:id/dashboard/product/:product", async (req, res) => {
  const { id, product } = req.params;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    const findproduct = await productModel.findByPk(product);

    if (findId) {
      res.render("user/product", { id: id, product: findproduct?.dataValues });
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.post("/:id/dashboard/product/:product", async (req, res) => {
  const { id, product } = req.params;
  const { quantity } = req.body;

  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    const findproduct = await productModel.findByPk(product);
    console.log(findproduct.dataValues);
    console.log(findId.dataValues);

    if (findId) {
      if (findproduct) {
        const total = findproduct?.dataValues.price * quantity;
        const order = orderModel
          .create({
            name: findId.dataValues.name,
            datetime: new Date(),
            order: findproduct?.dataValues.name,
            quantity: quantity,
            total: total,
            address: findId.dataValues.address,
            pincode: findId.dataValues.pincode,
            phone: findId.dataValues.phone,
            status: "Processing",
            customerid: findId.dataValues.id,
          })
          .then((order) => {
            res.render(`user/pay`, { id: product, order: order.dataValues });
          })
          .catch((err) => {
            res.json({ err: err.message });
          });
      } else {
        res.json({ err: "Error Detected" });
      }
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.get("/:id/dashboard/product/:product/pay", async (req, res) => {
  const { id, product } = req.params;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    if (findId) {
      res.redirect(`/user/${id}/dashboard/orders`);
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.get("/:id/dashboard/contact", async (req, res) => {
  const { id } = req.params;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    if (findId) {
      res.render("user/contact", { id: id });
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.get("/:id/dashboard/feedback", async (req, res) => {
  const { id } = req.params;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    if (findId) {
      res.render("user/feedback", { id: id, post: false });
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.post("/:id/dashboard/feedback", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  console.log(req.body);

  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    if (findId) {
      const sendFeedback = await feedbackModel.create({
        message: message,
        name: findId.dataValues.name,
        email: findId.dataValues.email,
      });
      res.render("user/feedback", { id: id, post: true });
    } else {
      res.clearCookie("user");
      res.redirect("/user/login");
    }
  } else {
    res.redirect("/user/login");
  }
});

router.get("/:id/dashboard/profile", async (req, res) => {
  const { id } = req.params;
  if (req.cookies.user) {
    const findId = await loginModel.findByPk(id);
    if (findId) {
      res.render("user/profile", { profile: findId.dataValues });
    } else {
      res.redirect("/user/login");
    }
  } else {
    res.clearCookie("user");
    res.redirect("/user/login");
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("user");
  res.redirect("/user/login");
});

module.exports = router;
