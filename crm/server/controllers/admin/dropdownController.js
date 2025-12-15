import { validationResult } from 'express-validator';
import Dropdown from '../../models/Dropdown.js';

export const createDropdownOption = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const optionData = {
      ...req.body,
      createdBy: req.user.userId || req.user.id
    };

    const option = new Dropdown(optionData);
    await option.save();

    res.status(201).json(option);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getDropdownOptions = async (req, res) => {
  try {
    const options = await Dropdown.find()
      .sort({ category: 1, sortOrder: 1 });
    
    // Note: createdBy and updatedBy are stored as UUID strings (Kinde user IDs)
    // They cannot be populated using Mongoose populate since User._id is ObjectId
    // If user details are needed, fetch them separately using the UUID
    
    res.json(options);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getDropdownOptionsByCategory = async (req, res) => {
  try {
    const options = await Dropdown.find({ 
      category: req.params.category,
      isActive: true 
    }).sort({ sortOrder: 1 });
    
    res.json(options);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getDropdownOptionsGroupByCategory = async (req, res) => {
  try {
    const options = await Dropdown.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', options: { $push: '$$ROOT' } } },
      { $sort: { sortOrder: 1 } }
    ]);

    res.json(options);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
}

export const updateDropdownOption = async (req, res) => {
  try {
    const option = await Dropdown.findByIdAndUpdate(
      req.params.id,
      { ...req.body,
        updatedBy: req.user.userId || req.user.id
       },
      { new: true }
    );

    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    res.json(option);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const deleteDropdownOption = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ message: 'Option ID is required' });
    }
    const option = await Dropdown.findByIdAndDelete(req.params.id);

    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    res.json({ message: 'Option deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getDropdownCategories = async (req, res) => {
  try {
    const categories = await Dropdown.distinct('category', { isActive: true });

    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: 'No categories found' });
    }

    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export default {
  createDropdownOption,
  getDropdownOptions,
  getDropdownOptionsByCategory,
  getDropdownOptionsGroupByCategory,
  updateDropdownOption,
  deleteDropdownOption,
  getDropdownCategories
};