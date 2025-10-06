import { AuthRequest } from "./../types/express.types";
import Course from "src/models/course.model";
import Lesson from "src/models/lesson.model";
import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "src/models/user.model";

// Tạo khóa học mới