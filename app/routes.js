//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/gamma/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('gamma/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/gamma/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/transport/transport-container-vessel');
  } else {
    res.redirect('/gamma/transport/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling landings option selection
router.post('/gamma/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/gamma/progress'); // Always go to the same progress page
  } else {
    res.redirect('/gamma/landings/landings-entry'); // Redirect back if no option selected
  }
});




// Route for handling truck transport
router.post('/gamma/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/gamma/transport/transport-documents');
});

// Route for handling plane transport
router.post('/gamma/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/gamma/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/gamma/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/gamma/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/transport/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/gamma/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});

// TRAIN DOCUMENTS
router.post('/gamma/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});

// PLANE DOCUMENTS
router.post('/gamma/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});

// VESSEL DOCUMENTS
router.post('/gamma/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});





router.post('/gamma/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/gamma/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  // Save the updated document names and reference numbers back to the session

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/gamma/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/gamma/progress-complete');
  } else {
    res.redirect('/gamma/transport/transport-additional');
  }
});

// Route for handling the 'Your reference' page
router.post('/gamma/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/progress');
  } else {
    res.redirect('/gamma/exporter-details');
  }
});


// Route for exporter details
router.post('/gamma/exporter-details', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('/gamma/add-products')
})

// Route for adding products
router.post('/gamma/add-products', function (req, res) {
  const products = req.session.data['products'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;
  products.push({
    species,
    state,
    presentation,
    commodityCode
  });
  req.session.data['products'] = products;
  res.redirect('/gamma/add-products');
})

// Redirect to the next step or back to add-products page
router.post('/gamma/delete-product/:index', function (req, res) {
  const products = req.session.data['products'] ?? [];
  products.splice(parseInt(req.params.index) - 1, 1);
  req.session.data['products'] = products;
  res.redirect('/gamma/add-products');

})


// Route for adding a product favourite
router.post('/gamma/product-favourites', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;

  favourites.push({
    species,
    state,
    presentation,
    commodityCode
  });

  req.session.data['favourites'] = favourites;
  res.redirect('/gamma/product-favourites');
});

// Route for deleting a product favourite by index
router.post('/gamma/delete-favourite/:index', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  favourites.splice(parseInt(req.params.index), 1);
  req.session.data['favourites'] = favourites;
  res.redirect('/gamma/product-favourites');
});

// Route for rendering the product favourites page
router.get('/gamma/product-favourites', function (req, res) {
  res.render('gamma/product-favourites', { data: req.session.data });
});


// Route for displaying the add-landings page
router.get('/gamma/direct-landing', function (req, res) {
  res.render('/gamma/direct-landing', { data: req.session.data });
});

// Route for landing details
router.post('../gamma/direct-landing', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];


 // Save weights array
session['weights'] = req.body['weights'];

// Calculate total export weight
let totalWeight = 0;
const weights = req.body['weights'];

if (weights) {
  for (const item of Object.values(weights)) {
    const weight = parseFloat(item.exportWeight);
    if (!isNaN(weight)) {
      totalWeight += weight;
    }
  }
}

session['totalWeight'] = totalWeight.toFixed(2);


res.redirect('../gamma/catch-waters');

});


// Route for landing details
router.post('../gamma/manual-entry', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  session['weights'] = req.body['weights']; // This is an array of objects

  // Calculate total weight
  let totalWeight = 0;
  const weights = req.body['weights'];

  if (weights) {
    for (const item of Object.values(weights)) {
      const weight = parseFloat(item.exportWeight);
      if (!isNaN(weight)) {
        totalWeight += weight;
      }
    }
  }

  session['totalWeight'] = totalWeight.toFixed(2);

  // Track landings
  if (!session.landings) {
    session.landings = [];
  }

  // Add new landing to the array
  session.landings.push({
    startDateDay: req.body['startDateDay'],
    startDateMonth: req.body['startDateMonth'],
    startDateYear: req.body['startDateYear'],
    dateLandedDay: req.body['dateLandedDay'],
    dateLandedMonth: req.body['dateLandedMonth'],
    dateLandedYear: req.body['dateLandedYear'],
    faoArea: req.body['faoArea'],
    vessel: req.body['vessel'],
    gear1: req.body['gear1'],
    gear2: req.body['gear2'],
    weights: req.body['weights']
  });

  // Save landing count
  session['landingCount'] = session.landings.length;

  // Redirect to the next step
  res.redirect('../gamma/catch-waters');
});



// Route for export journey


router.post('../gamma/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../gamma/export-journey');
});

router.post('../gamma/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../gamma/progress');
});

router.post('../gamma/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../gamma/export-journey');
});

// Route for plane transport

router.post('../gamma/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../gamma/progress');
});

router.post('../gamma/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../gamma/transport/transport-type');
});

router.post('../gamma/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../gamma/progress');
});

router.post('../gamma/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../gamma/transport/transport-documents-plane');
});

router.post('../gamma/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../gamma/catch-certificate-complete');
});

router.get('../gamma/catch-certificate-complete', function (req, res) {
  res.render('../gamma/catch-certificate-complete');
});

// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/poc/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('poc/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/poc/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/poc/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/poc/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/poc/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/poc/transport/transport-container-vessel');
  } else {
    res.redirect('/poc/transport/transport-type');  // Redirect back if no option selected

  }
});


// Route for handling truck transport
router.post('/poc/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/poc/transport/transport-documents');
});

// Route for handling plane transport
router.post('/poc/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/poc/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/poc/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/poc/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-vessel');
});


router.get('/poc/transport/transport-documents', function (req, res) {
  const editIndex = req.query.edit;
  const removeIndex = req.query.remove;

  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  // Handle removal
  if (removeIndex !== undefined) {
    documentNames.splice(removeIndex, 1);
    referenceNumbers.splice(removeIndex, 1);
    req.session.data['documentName[]'] = documentNames;
    req.session.data['referenceNumber[]'] = referenceNumbers;
    return res.redirect('/poc/transport/transport-additional');
  }

  // Handle editing
  if (editIndex !== undefined) {
    res.render('poc/transport/transport-documents', {
      data: req.session.data,
      editIndex: editIndex,
      editDocumentName: documentNames[editIndex],
      editReferenceNumber: referenceNumbers[editIndex]
    });
  } else {
    res.render('poc/transport/transport-documents', {
      data: req.session.data
    });
  }
});



router.post('/poc/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/poc/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/poc/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/poc/progress-complete');
  } else {
    res.redirect('/poc/transport/transport-additional');
  }
});




// Route for exporter details
router.post('../poc/add-products', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('../poc/add-products')
})



// Route for landing details
router.post('../poc/add-landings', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['weight'] = req.body['weight'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  // Redirect to the next step
  res.redirect('../poc/catch-waters');
});


// Route for export journey


router.post('../poc/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../poc/export-journey');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/progress');
});

router.post('../poc/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/export-journey');
});

// Route for plane transport

router.post('../poc/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/transport/transport-type');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/transport/transport-documents-plane');
});

router.post('../poc/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../poc/catch-certificate-complete');
});

router.get('../poc/catch-certificate-complete', function (req, res) {
  res.render('../poc/catch-certificate-complete');
});

// Helper function to group transport types and attach document arrays
function getGroupedTransportTypes(data) {
  const grouped = {};
  const types = data['transportTypes'] || [];
  types.forEach((t, idx) => {
    // Only attach document arrays to the first entry of each type
    const isFirstOfType = idx === types.findIndex(e => e.type === t.type);
    const entry = { ...t, _originalIndex: idx };
    if (isFirstOfType) {
      if (t.type === 'Truck') {
        entry.documentName = data['documentName[]'] || [];
        entry.referenceNumber = data['referenceNumber[]'] || [];
      } else if (t.type === 'Train') {
        entry.documentName = data['trainDocumentName[]'] || [];
        entry.referenceNumber = data['trainReferenceNumber[]'] || [];
      } else if (t.type === 'Plane') {
        entry.documentName = data['planeDocumentName[]'] || [];
        entry.referenceNumber = data['planeReferenceNumber[]'] || [];
      } else if (t.type === 'Container vessel') {
        entry.documentName = data['vesselDocumentName[]'] || [];
        entry.referenceNumber = data['vesselReferenceNumber[]'] || [];
      }
    } else {
      entry.documentName = [];
      entry.referenceNumber = [];
    }
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(entry);
  });
  // Remove duplicate document/reference display: only keep docs/refs on first entry of each type
  Object.keys(grouped).forEach(type => {
    grouped[type].forEach((entry, i) => {
      if (i > 0) {
        entry.documentName = [];
        entry.referenceNumber = [];
      }
    });
  });
  return grouped;
}

// Update GET for check-your-answers
router.get('/gamma/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('gamma/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});

// Update GET for transport-additional
router.get('/gamma/transport/transport-additional', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('gamma/transport/transport-additional', {
    data,
    groupedTransportTypes
  });
});

//Routes for non-manipulation document (nmd)

// Route for handling the 'Your reference' page
router.post('/gamma/nmd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/nmd/progress');
  } else {
    res.redirect('/gamma/nmd/exporter-details');
  }
});

// Route for exporter details
router.post('/gamma/nmd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/gamma/nmd/uk-document')
})

// Route for uk document details
router.post('/gamma/nmd/uk-document', function (req, res) {
  req.session.data['uk-document'] = req.body['uk-document'];

  const issuedInUK = req.body['uk-document'];

  if (issuedInUK === 'Yes') {
    res.redirect('/gamma/nmd/confirm-uk-document');
  } else if (issuedInUK === 'No') {
    res.redirect('/gamma/nmd/confirm-uk-document-2');
  } else {
    res.redirect('/gamma/nmd/uk-document'); // fallback if nothing selected
  }
});


// Route for uk document confirmation
router.post('/gamma/nmd/confirm-uk-document', function (req, res) {
  req.session.data['entry-document-reference'] = req.body['entry-document-reference']
  // Add more fields as needed
  res.redirect('/gamma/nmd/product-details')
});

// Route for uk document confirmation for third country
router.post('/gamma/nmd/confirm-uk-document-2', function (req, res) {
  req.session.data['entry-document-reference-2'] = req.body['entry-document-reference-2']
  // Add more fields as needed
  res.redirect('/gamma/nmd/product-details')
});


// Route for product details
router.post('/gamma/nmd/product-details', function (req, res) {
const newEntry = {
  species: req.body['species'],
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  referenceNumber: req.session.data['entry-document-reference'], // ✅ copy from top-level
  productReferenceNumber: req.body['productReferenceNumber'],
  netWeight: req.body['net-weight'],
  fishWeight: req.body['fish-weight']
};


  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/gamma/nmd/product-summary');
});



// Route for product summary
router.post('/gamma/nmd/product-summary', function (req, res) {


  // Clear single-entry fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/gamma/nmd/uk-document');
  } else if (productEntries === 'No') {
    res.redirect('/gamma/nmd/transport-type');
  } else {
    // ✅ Render the summary page directly if no selection
    res.render('product-summary', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/gamma/nmd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/gamma/nmd/product-summary');
});


router.get('/gamma/nmd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['entry-document-reference'] = product.referenceNumber;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/gamma/nmd/product-details');
});



// Route for handling transport selection
router.post('/gamma/nmd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/nmd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/nmd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/nmd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/nmd/transport-container-vessel');
  } else {
    res.redirect('/gamma/nmd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/gamma/nmd/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/gamma/nmd/transport-documents');
});

// Route for handling plane transport
router.post('/gamma/nmd/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/gamma/nmd/transport-documents-plane');
});

// Route for handling train transport
router.post('/gamma/nmd/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/nmd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/gamma/nmd/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/nmd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/gamma/nmd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// TRAIN DOCUMENTS
router.post('/gamma/nmd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// PLANE DOCUMENTS
router.post('/gamma/nmd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// VESSEL DOCUMENTS
router.post('/gamma/nmd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// Route for handling the storage facility arrival page
router.post('/gamma/nmd/arrival-details', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
    req.session.data['departure-location'] = req.body['departure-location'];
      req.session.data['storage-location'] = req.body['storage-location'];

      // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

// Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;

  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/nmd/progress');
  } else {
    res.redirect('/gamma/nmd/storage-facility-details');
  }
});

// Route for storage facility details
router.post('/gamma/nmd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-address');
});

// Route for storage facility details
router.post('/gamma/nmd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/gamma/nmd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/gamma/nmd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-approval');
});


// Route for storage facility approval
// Route for storage facility approval
router.post('/gamma/nmd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/gamma/nmd/storage-facility-summary');
});



// Route for storage facility summary
router.post('/gamma/nmd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/gamma/nmd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/gamma/nmd/departure-summary');
  } else {
    res.redirect('/gamma/nmd/storage-facility-summary');
  }
});

// Route for departure details
router.post('/gamma/nmd/departure-details', function (req, res) {
  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;

  // Capture departure location
  req.session.data['departure-location-uk'] = req.body['departure-location-uk'];

  // Redirect to the next step
  res.redirect('/gamma/nmd/departure-destination');
});


// Route for departure summary
router.post('/gamma/nmd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/gamma/nmd/departure-details');
});


// Route for consignment destination
router.post('/gamma/nmd/departure-destination', function (req, res) {
  // Capture the destination country
  const destinationCountry = req.body['departure-destination-country'];

  // Save to session
  req.session.data['departure-destination-country'] = destinationCountry;

  // Redirect to the next step in the journey
  res.redirect('/gamma/nmd/departure-transport-type');
});

router.post('/gamma/nmd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/nmd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/nmd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/nmd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/nmd/departure-transport-container-vessel');
  } else {
    res.redirect('/gamma/nmd/departure-transport-type');
  }
});

router.post('/gamma/nmd/departure-transport-truck', function (req, res) {
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];

  res.redirect('/gamma/nmd/departure-transport-documents');
});

router.post('/gamma/nmd/departure-transport-plane', function (req, res) {
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

  res.redirect('/gamma/nmd/departure-transport-documents-plane');
});

router.post('/gamma/nmd/departure-transport-train', function (req, res) {
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];

  res.redirect('/gamma/nmd/departure-transport-documents-train');
});

router.post('/gamma/nmd/departure-transport-container-vessel', function (req, res) {
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

  res.redirect('/gamma/nmd/departure-transport-documents-vessel');
});

router.post('/gamma/nmd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});

router.post('/gamma/nmd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});

router.post('/gamma/nmd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});

router.post('/gamma/nmd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});


router.get('/gamma/nmd/progress', function (req, res) {
  res.render('gamma/nmd/progress.html', {
    data: req.session.data
  });
});
router.post('/gamma/nmd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/gamma/nmd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/gamma/nmd/progress');
  }
});


// Route for handling the 'Your reference' page
router.post('/gamma/sd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/sd/progress');
  } else {
    res.redirect('/gamma/sd/exporter-details');
  }
});

// Route for exporter details
router.post('/gamma/sd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/gamma/sd/product-details')
})

// Route for product details
router.post('/gamma/sd/product-details', function (req, res) {
  const newEntry = {
    ukDocument: req.body['uk-document'], // now collected here
    issuingCountry: req.body['issuing-country'], // <-- add this line
    entryDocumentReference: req.body['entry-document-reference'], // now collected here
    entryWeight: req.body['entry-weight'], // <-- add this line
    species: req.body['species'],
    commodityCode: req.body['commodity-code'],
    description: req.body['description'],
    productReferenceNumber: req.body['productReferenceNumber'],
    netWeight: req.body['net-weight'],
    fishWeight: req.body['fish-weight']
  };

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/gamma/sd/product-summary');
});




// Route for product summary
router.post('/gamma/sd/product-summary', function (req, res) {
  // Clear single-entry fields
  req.session.data['uk-document'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/gamma/sd/product-details'); // ✅ stays in SD flow
  } else if (productEntries === 'No') {
    res.redirect('/gamma/sd/transport-type');
  } else {
    // ✅ Render the summary page directly if no selection
    res.render('product-summary', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/gamma/sd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['entry-document-reference'] = product.entryDocumentReference;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/gamma/sd/product-details');
});


router.get('/gamma/sd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/gamma/sd/product-summary');
});



// Route for handling transport selection
router.post('/gamma/sd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/sd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/sd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/sd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/sd/transport-container-vessel');
  } else {
    res.redirect('/gamma/sd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/gamma/sd/transport-truck', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['unloading-place'] = req.body['unloading-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

        // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    departureCountry: req.body['departure-country'],
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    unloadingPlace: req.body['unloading-place'],
    freightBillNumber: req.body['freight-number'],
    departureDate: req.session.data['departure-date']
  });
  res.redirect('/gamma/sd/transport-documents');
});

// Route for handling plane transport
router.post('/gamma/sd/transport-plane', function (req, res) {
  req.session.data['plane-departure-country'] = req.body['plane-departure-country'];
  req.session.data['unloading-place-plane'] = req.body['unloading-place-plane'];
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

          // Combine plane departure date
  const departureDay = req.body['plane-departure-date-day'];
  const departureMonth = req.body['plane-departure-date-month'];
  const departureYear = req.body['plane-departure-date-year'];
  req.session.data['plane-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    planeDepartureCountry: req.body['plane-departure-country'],
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    unloadingPlacePlane: req.body['unloading-place-plane'],
    containerIdentification: req.body['container-identification'],
    planeDepartureDate: req.session.data['plane-departure-date']
  });
  res.redirect('/gamma/sd/transport-documents-plane');
});

// Route for handling train transport
router.post('/gamma/sd/transport-train', function (req, res) {
  req.session.data['train-departure-country'] = req.body['train-departure-country'];
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['unloading-place-train'] = req.body['unloading-place-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine train departure date
  const departureDay = req.body['train-departure-date-day'];
  const departureMonth = req.body['train-departure-date-month'];
  const departureYear = req.body['train-departure-date-year'];
  req.session.data['train-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    trainDepartureCountry: req.body['train-departure-country'],
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    unloadingPlaceTrain: req.body['unloading-place-train'],
    freightBillNumber: req.body['freight-bill'],
    trainDepartureDate: req.session.data['train-departure-date']
  });
  res.redirect('/gamma/sd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/gamma/sd/transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-country'] = req.body['container-vessel-departure-country'];
  req.session.data['unloading-place-vessel'] = req.body['unloading-place-vessel'];
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine container vessel departure date
  const departureDay = req.body['container-vessel-departure-date-day'];
  const departureMonth = req.body['container-vessel-departure-date-month'];
  const departureYear = req.body['container-vessel-departure-date-year'];
  req.session.data['container-vessel-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    containerVesselDepartureCountry: req.body['container-vessel-departure-country'],
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    unloadingPlaceVessel: req.body['unloading-place-vessel'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill'],
    containerVesselDepartureDate: req.session.data['container-vessel-departure-date']
  });
  res.redirect('/gamma/sd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/gamma/sd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});

// TRAIN DOCUMENTS
router.post('/gamma/sd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});

// PLANE DOCUMENTS
router.post('/gamma/sd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});

// VESSEL DOCUMENTS
router.post('/gamma/sd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});


// Route for storage facility details
router.post('/gamma/sd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];

  // Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-address');
});

// Route for storage facility details
router.post('/gamma/sd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/gamma/sd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/gamma/sd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-approval');
});

// Route for storage facility approval
router.post('/gamma/sd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/gamma/sd/departure-transport-type');
});



// Route for storage facility summary
router.post('/gamma/sd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/gamma/sd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/gamma/sd/departure-transport-type');
  } else {
    res.redirect('/gamma/sd/storage-facility-summary');
  }
});

// Route for departure transport details
router.post('/gamma/sd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/sd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/sd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/sd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/sd/departure-transport-container-vessel');
  } else {
    res.redirect('/gamma/sd/departure-transport-type');
  }
});





router.post('/gamma/sd/departure-transport-truck', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];

  const destinationCountry = req.body['departure-destination-country'];

  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;
  

  res.redirect('/gamma/sd/departure-transport-documents');
});

router.post('/gamma/sd/departure-transport-plane', function (req, res) {
  req.session.data['plane-departure-destination-country'] = req.body['plane-departure-destination-country'];
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

    // Capture date parts
  const day = req.body['plane-departure-date-uk-day'];
  const month = req.body['plane-departure-date-uk-month'];
  const year = req.body['plane-departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['plane-departure-date-uk'] = departureDate;

  res.redirect('/gamma/sd/departure-transport-documents-plane');
});

router.post('/gamma/sd/departure-transport-train', function (req, res) {
  req.session.data['train-departure-destination-country'] = req.body['train-departure-destination-country'];
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];

      // Capture date parts
  const day = req.body['train-departure-date-uk-day'];
  const month = req.body['train-departure-date-uk-month'];
  const year = req.body['train-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['train-departure-date-uk'] = departureDate;

  res.redirect('/gamma/sd/departure-transport-documents-train');
});

router.post('/gamma/sd/departure-transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-destination-country'] = req.body['container-vessel-departure-destination-country'];
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

      // Capture date parts
  const day = req.body['container-vessel-departure-date-uk-day'];
  const month = req.body['container-vessel-departure-date-uk-month'];
  const year = req.body['container-vessel-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['container-vessel-departure-date-uk'] = departureDate;

  res.redirect('/gamma/sd/departure-transport-documents-vessel');
});

router.post('/gamma/sd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});

router.post('/gamma/sd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});

router.post('/gamma/sd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});

router.post('/gamma/sd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});


router.get('/gamma/sd/progress', function (req, res) {
  res.render('gamma/sd/progress.html', {
    data: req.session.data
  });
});

// Route for departure summary
router.post('/gamma/sd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/gamma/sd/progress');
});

router.post('/gamma/sd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/gamma/sd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/gamma/sd/progress');
  }
});

// Route for handling the 'Your reference' page
router.post('/gamma/ps/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/ps/progress');
  } else {
    res.redirect('/gamma/ps/exporter-details');
  }
});

// Route for exporter details
router.post('/gamma/ps/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/gamma/ps/product-description')
})

// Route for product description
router.post('/gamma/ps/product-description', function (req, res) {
  const newEntry = {
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  isPartial: true // flag to indicate it's awaiting details
};

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  req.session.data['description'] = req.body['description'];
  req.session.data['commodity-code'] = req.body['commodity-code'];

  res.redirect('/gamma/ps/product-details');
});

// GET route for product details page
router.get('/gamma/ps/product-details', function (req, res) {
  res.render('gamma/ps/product-details', {
    data: req.session.data || {}
  });
});

// Route for product details
router.post('/gamma/ps/product-details', function (req, res) {
  const action = req.body.action;

  const newDetails = {
    ukDocument: req.body['uk-document'],
    issuingCountry: req.body['issuing-country'], // <-- add this line
    species: req.body['species'],
    productReferenceNumber: req.body['productReferenceNumber'],
    'catch-certificate-weight': req.body['catch-certificate-weight'],
    'net-weight': req.body['net-weight'],
    'fish-weight': req.body['fish-weight'],
    isPartial: false,
    description: req.session.data['description'],
    commodityCode: req.session.data['commodity-code']
  };

  // ✅ Validate required fields before saving
  const hasRequiredFields =
    newDetails.species &&
    newDetails.productReferenceNumber &&
    newDetails['net-weight'] &&
    newDetails['fish-weight'] &&
    newDetails['catch-certificate-weight'];

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  if (hasRequiredFields) {
    const editIndex = req.session.data['editIndex'];
    if (typeof editIndex !== 'undefined') {
      req.session.data['productEntries'][editIndex] = newDetails;
      delete req.session.data['editIndex'];
    } else {
      req.session.data['productEntries'].push(newDetails);
    }
  }

  // ✅ Store species in session for pre-filling
  req.session.data['species'] = req.body['species'];

  if (action === 'add') {
    res.redirect('/gamma/ps/product-details#species-table-container');
  } else if (action === 'continue') {
    res.redirect('/gamma/ps/updated-product-summary');
  }
});

// Route for product summary search and pagination
router.get('/gamma/ps/product-summary', function (req, res) {

  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  let productEntries = req.session.data['productEntries'] || [];

// Filter
if (searchQuery) {
  productEntries = productEntries.filter(entry =>
    (entry.description ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.species ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.commodityCode ?? '').toString().toLowerCase().includes(searchQuery) ||
    (
      Array.isArray(entry.productReferenceNumber)
        ? entry.productReferenceNumber.some(ref =>
            ref.toLowerCase().includes(searchQuery)
          )
        : (entry.productReferenceNumber ?? '').toString().toLowerCase().includes(searchQuery)
    )
  );
}



  // Paginate
  const totalPages = Math.ceil(productEntries.length / perPage);
  const paginatedEntries = productEntries.slice((page - 1) * perPage, page * perPage);

  res.render('gamma/ps/product-summary', {
    data: {
      productEntries: paginatedEntries,
      description: req.session.data['description']
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

router.get('/gamma/ps/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/gamma/ps/product-details');
});

// Route for product summary
router.post('/gamma/ps/product-summary', function (req, res) {
  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    // ✅ Clear single-entry fields to prevent carry-over
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';

    // ✅ Clear edit index to ensure new entry is created
    delete req.session.data['editIndex'];

    // ❌ Do NOT clear productEntries — keep previous products
    // req.session.data['productEntries'] = []; ← removed

    res.redirect('/gamma/ps/product-description'); // stays in PS flow
  } else if (productEntries === 'No') {
    res.redirect('/gamma/ps/plant-details');
} else {
  // Render the summary page directly if no selection
  res.render('gamma/ps/product-summary', {
    data: {
      productEntries: req.session.data['productEntries'],
      description: req.session.data['description']
    },
    currentPage: 1,
    totalPages: Math.ceil((req.session.data['productEntries'] || []).length / 10),
    searchQuery: ''
  });
}

});

// Route for updated-product-summary
router.get('/gamma/ps/updated-product-summary', function (req, res) {
  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  const allProductEntries = req.session.data['productEntries'] || [];

  // Filter out partial or incomplete entries
  let filteredEntries = allProductEntries.filter(entry =>
    !entry.isPartial && entry.species
  );

  // Apply search filter
  if (searchQuery) {
    filteredEntries = filteredEntries.filter(entry =>
      (entry.description ?? '').toLowerCase().includes(searchQuery) ||
      (entry.species ?? '').toLowerCase().includes(searchQuery) ||
      (entry.commodityCode ?? '').toLowerCase().includes(searchQuery) ||
      (
        Array.isArray(entry.productReferenceNumber)
          ? entry.productReferenceNumber.some(ref =>
              ref.toLowerCase().includes(searchQuery)
            )
          : (entry.productReferenceNumber ?? '').toLowerCase().includes(searchQuery)
      )
    );
  }

  // Paginate after filtering
  const totalPages = Math.ceil(filteredEntries.length / perPage);
  const paginatedEntries = filteredEntries.slice((page - 1) * perPage, page * perPage);

  res.render('gamma/ps/updated-product-summary', {
    data: {
      productEntries: paginatedEntries,       // filtered + paginated
      allProductEntries: allProductEntries    // full list for counting
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

//Route for updated-product-summary
router.post('/gamma/ps/updated-product-summary', function (req, res) {
  const moreProducts = req.body['more-products'];
  req.session.data['more-products'] = moreProducts;

  if (moreProducts === 'Yes') {
    // Clear single-entry fields
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    delete req.session.data['editIndex'];

    res.redirect('/gamma/ps/product-description');
  } else if (moreProducts === 'No') {
    res.redirect('/gamma/ps/plant-details');
  } else {
    // No selection made — redirect to GET route
    res.redirect('/gamma/ps/updated-product-summary');
  }
});



// Route for storage facility details
router.post('/gamma/ps/plant-details', function (req, res) {
  req.session.data['plant-name'] = req.body['plant-name'];
  req.session.data['person-name'] = req.body['person-name'];
  req.session.data['approval-number'] = req.body['approval-number'];
  // Add more fields as needed
  res.redirect('/gamma/ps/plant-address');
});

// Route for storage facility details
router.post('/gamma/ps/plant-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/gamma/ps/plant-address-2');
});

// Route for storage facility address
router.post('/gamma/ps/plant-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/gamma/ps/plant-confirmation');
});

// Route for storage facility confirmation
router.post('/gamma/ps/plant-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/gamma/ps/health-certificate');

});

// Route for health certificate details
router.post('/gamma/ps/health-certificate', function (req, res) {
  req.session.data['health-certificate'] = req.body['health-certificate'];

    // Combine arrival date
const arrivalDay = req.body['certificate-date-day'];
const arrivalMonth = req.body['certificate-date-month']; // fix typo in HTML
const arrivalYear = req.body['certificate-date-year'];
req.session.data['certificate-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/gamma/ps/departure-destination');
});

// Route for departure destination
router.post('/gamma/ps/departure-destination', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  // Add more fields as needed
  res.redirect('/gamma/ps/progress');
});

router.post('/gamma/ps/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/gamma/ps/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/gamma/ps/progress');
  }
});



