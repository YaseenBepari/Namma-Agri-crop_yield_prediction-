const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const csvParser = require('csv-parser');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb+srv://Yaseen0806:Yaseen_0806@cluster0.bnzgg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Define Crop Schema and Model
const Crop = mongoose.model('Crop', new mongoose.Schema({
  soilType: String,
  weather: String,
  state: String,
  totalLand: Number,
  cropName: String,
  yieldPercentage: Number
}));

// Endpoint to upload the dataset and store in MongoDB
app.post('/upload-dataset', (req, res) => {
  const results = [];
  fs.createReadStream('crop_yield_data_with_crop.csv') // Ensure this file is in the project directory
    .pipe(csvParser())
    .on('data', (data) => {
      results.push({
        soilType: data['Soil Type'].trim(),
        weather: data['Weather'].trim(),
        state: data['State'].trim(),
        totalLand: parseFloat(data['Total Land (Acres)']),
        cropName: data['Crop Name'].trim(),
        yieldPercentage: parseFloat(data['Crop Yield (%)']),
      });
    })
    .on('end', () => {
      Crop.insertMany(results)
        .then(() => res.send('Dataset uploaded successfully!'))
        .catch((err) => res.status(500).send('Error uploading dataset: ' + err));
    });
});

// Endpoint to predict the crop based on input conditions
app.post('/predict', (req, res) => {
  const { soilType, weather, state, totalLand } = req.body;
  
  // Log the request body to confirm data
  console.log('Received data:', req.body);

  // Normalize input to handle spaces and case differences
  const normalizedSoilType = soilType.trim().toLowerCase();
  const normalizedWeather = weather.trim().toLowerCase();
  const normalizedState = state.trim().toLowerCase();

  // Log normalized data
  console.log('Normalized Data:', { normalizedSoilType, normalizedWeather, normalizedState });

  Crop.findOne({
    soilType: { $regex: new RegExp(`^${normalizedSoilType}$`, 'i') },
    weather: { $regex: new RegExp(`^${normalizedWeather}$`, 'i') },
    state: { $regex: new RegExp(`^${normalizedState}$`, 'i') },
    totalLand: { $gte: totalLand - 5, $lte: totalLand + 5 }
  })
    .then((crop) => {
      if (crop) {
        res.json({
          predictedCrop: crop.cropName,
          yieldPercentage: crop.yieldPercentage,
          details: crop,
        });
      } else {
        res.status(404).send('No matching crop found');
      }
    })
    .catch((err) => {
      console.log('Error predicting crop:', err);
      res.status(500).send('Error predicting crop: ' + err);
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
