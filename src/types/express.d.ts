declare namespace Express {
  interface Request {
    user?: import('#/common/interfaces/index.js').CurrentUser;
  }
}
