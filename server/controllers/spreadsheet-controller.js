var multiparty = require('multiparty'),
    xlsx = require('node-xlsx'),
    util = require('util');
    
module.exports = function (app) {

  //parse the incoming form data, then parse the spreadsheet. Finally, send back json.
  app.post('/upload', function (req, res) {
    //TODO: Add file validation
    var form = new multiparty.Form(),
        currentSheet,
        network = {genes: [],
                   links: [],
                   errors: [],
                   positiveWeights: [],
                   negativeWeights: []},
        currentLink,
        currentGene;
    form.parse(req, function (err, fields, files) {
      if (err) return res.json(400, err);
      try {
        var sheet = xlsx.parse(files.file[0].path);
      } catch (err) {
        return res.json(400, err);
      }

      // For the time being, send the result in a form readable by people
      //TODO: Optimize the result for D3
      res.header('Access-Control-Allow-Origin', app.get('corsOrigin'));
      //Look for the worksheet containing the network data
      for (var i = 0; i < sheet.worksheets.length; i++) {
        if (sheet.worksheets[i].name == "network") {
          //Here we have found a sheet containing simple data. We keep looking
          //in case there is also a sheet with optimized weights
          currentSheet = sheet.worksheets[i];
        } else if (sheet.worksheets[i].name == "network_optimized_weights") {
          //We found a sheet with optimized weights, which is the ideal data source.
          //So we stop looking.
          currentSheet = sheet.worksheets[i];
          break;
        }
      }
      
      for (var j = 1; j < currentSheet.data.length; j++) {
        try {
          currentGene = {name: currentSheet.data[0][j].value}
          network.genes.push(currentGene);
        } catch (err) {
          network.errors.push(err);
        }
        for(var k = 1; k < currentSheet.data[j].length; k++) {
          try {
            if (currentSheet.data[j][k].value != 0) {
              currentLink = {source: k - 1, target: j - 1, value: currentSheet.data[j][k].value};
              if (currentLink.value > 0) {
                currentLink.type = "arrowhead";
                currentLink.stroke = "MediumVioletRed";
                network.positiveWeights.push(currentLink.value);
              } else {
                currentLink.type = "repressor";
                currentLink.stroke = "DarkTurquoise";
                network.negativeWeights.push(currentLink.value);
              }
              network.links.push(currentLink);
            }
          } catch (err) {
            network.errors.push(err);
          }
        }
      }
      return res.json(network);
    });
  });
}