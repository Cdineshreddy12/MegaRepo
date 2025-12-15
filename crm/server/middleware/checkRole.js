const normalize = (value) => (value || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

const checkRole = (...roles) => {
  const allowed = roles.map(normalize);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const userRole = normalize(req.user.role);
    const headerRole = normalize(req.headers['x-role-name']);

    if (!allowed.includes(userRole) && (!headerRole || !allowed.includes(headerRole))) {
      return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
    }

    next();
  };
};

export default checkRole;