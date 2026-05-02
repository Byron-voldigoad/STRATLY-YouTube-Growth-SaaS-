import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Validate token via Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      return;
    }

    // Inject verified userId into request
    req.userId = user.id;

    // Secure the payload: prevent IDOR by overriding any provided userId 
    // with the authenticated user's ID
    if (req.body && req.body.data) {
        req.body.data.userId = user.id;
    }
    if (req.body) {
        req.body.userId = user.id;
    }
    
    if (req.method === 'GET' || req.method === 'DELETE') {
        req.query.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error during authentication' });
    return;
  }
};
