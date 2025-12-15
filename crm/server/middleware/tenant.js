const tenantMiddleware = (req, res, next) => {
  try {
    console.log('🔍 Tenant middleware executing for path:', req.path);
    console.log('🔍 req.user:', req.user);
    console.log('🔍 req.user?.orgCode:', req.user?.orgCode);
    console.log('🔍 Tenant middleware START - path:', req.path, 'method:', req.method);
    console.log('🔍 Tenant middleware - THIS SHOULD APPEAR IF MIDDLEWARE IS WORKING');
    console.log('🔍 Tenant middleware - THIS SHOULD APPEAR IF MIDDLEWARE IS WORKING');
  
  const role = req.user?.role;
  const isPrivileged = role === 'admin' || role === 'super_admin';

  const requestedOrgFromQuery = req.query.orgCode;
  const requestedOrgFromHeader = req.headers['x-org-code'];

  const resolved = {
    orgCode: req.user?.orgCode || null,
    source: 'token'
  };

  console.log('🔍 Resolved orgCode:', resolved);

  if (isPrivileged && (requestedOrgFromQuery || requestedOrgFromHeader)) {
    resolved.orgCode = requestedOrgFromQuery || requestedOrgFromHeader;
    resolved.source = requestedOrgFromQuery ? 'query' : 'header';
  }

  if (!resolved.orgCode && !isPrivileged) {
    console.log('❌ No orgCode found, returning 400');
    return res.status(400).json({ message: 'orgCode required' });
  }

  req.tenant = { orgCode: resolved.orgCode };
  console.log('✅ Set req.tenant:', req.tenant);
  console.log('🔍 req.tenant.orgCode will be:', req.tenant.orgCode);

  // Avoid caching tenant-scoped responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  console.log('🔍 Tenant middleware END - calling next()');
  next();
  } catch (error) {
    console.error('❌ Error in tenant middleware:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ message: 'Internal server error in tenant middleware' });
  }
};

export default tenantMiddleware;

