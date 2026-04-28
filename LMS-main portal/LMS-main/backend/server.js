import mongoose from 'mongoose';
import express from 'express';
    import cors from 'cors';
    import dotenv from 'dotenv';
    import { connectDB } from './config/db.js';
    import authRoutes from './routes/auth.js';
    import courseRoutes from './routes/courses.js';
    import topicRoutes from './routes/topics.js';
    import problemRoutes from './routes/problems.js';
    import codeRoutes from './routes/code.js';
    import submissionRoutes from './routes/submissions.js';
    import dashboardRoutes from './routes/dashboard.js';

    dotenv.config();
    connectDB();
    //console.log("DB NAME:",mongoose.connection.name);

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/topics', topicRoutes);
    app.use('/api/problems', problemRoutes);
    app.use('/api/code', codeRoutes);
    app.use('/api/submissions', submissionRoutes);
    app.use('/api/dashboard', dashboardRoutes);

    app.get('/', (req, res) => res.json({ message: 'LMS API Running' }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
