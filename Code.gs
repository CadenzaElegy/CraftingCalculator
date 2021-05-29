/*
 * Crafting Recipe Calculator
 * by CadenzaElegy
 * github: https://github.com/CadenzaElegy/CraftingCalculator
 * twitter: @CadenzaElegy
 * reddit: /u/CadenzaElegy
 */

// Declaring global variables
var ingredientList = [];
var recipeList = [];

function calculateIngredients() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // Declare all the relevant sheets as variables
  var inputSheet = spreadsheet.getSheetByName("Input");
  var dbSheet = spreadsheet.getSheetByName("Database Import");

  // Create an array of the database so that we won't have to constantly perform lookups on the sheet
  var dbArray = dbSheet.getDataRange().getValues();  

  //  Get an array of all the Item(s) needed and their respective quantities
  var itemList = []
  var quantList = []

  // Create an ingredient list for up to i-3 different items at the same time! (Can be easily expanded or turned into a while loop to accept as many inputs as necessary)
  for (let i = 3; 1 < 13; i++){
    if (inputSheet.getRange(i,2).isBlank()){
      break;
    } else {
      itemList.push(inputSheet.getRange(i, 2).getValue());
      quantList.push(inputSheet.getRange(i, 3).getValue());
    }    
  }

  //  Create Ingredient and Recipe lists
  for (let i = 0; i < itemList.length; i++){
    formIngredientList(dbArray,itemList[i], quantList [i]);
    formRecipeList(dbArray,itemList[i], quantList [i]);
    recipeList.push([itemList[i], quantList[i]]) // Adding the original recipe into the mix
  }

  //  Within ingredientList and recipeList, combine all quantities of the same items
  var shortList = combineItems(ingredientList);
  var shortOrder = combineItems(recipeList);

  //  Calculate the recipe crafting order
  var properOrder = formRecipeOrder(dbArray, shortOrder);

  //  With the completed ingredient list and recipe list in correct order, clear the previous results and output the new ones.
  //  Clear the Ingredient List and Recipe List
  clearRect(inputSheet, 2, 4, 100, 2);
  clearRect(inputSheet, 2, 8, 100, 3);
  //  Print the Ingredient List and Recipe List
  printToCells(inputSheet, 3, 5, shortList);
  printToCells(inputSheet, 3, 9, properOrder);

}

//  Function returns index (row #) of itemName in a given array (db)'s SPECIFIC column number (col).
function getIndexOf(db, col, itemName){
  for (let i = 0; i < db.length; i++) {
    if (db[i][col] === itemName) {
      return i;
    }
  }
}

//  Function combines quantities (column 2) of all items with the same names (column 1).
function combineItems(arr) {
  var shortList = [];
  for (let i = 0; i < arr.length; i++){
    let pointer = getIndexOf(shortList, 0, arr[i][0]);
    if(pointer > -1){
      shortList[pointer][1] += arr[i][1];
    } else {
      shortList.push(arr[i]);
    }
  }
  return shortList;
}

//  Function clears a rectangular portion of a selected sheet.
//  Caution while using this function.
//  keepRow and keepCol are the first rows and columns you would like to keep (or the top left corner of the rectangle you'd like to clear).
//  numRow and numCol are the # of rows and columns to clear.
function clearRect(sheet, keepRow, keepCol, numRow, numCol){
  sheet.getRange(keepRow+1, keepCol+1, numRow, numCol).clearContent();
}

//  Prints an array (arr) to a given sheet (sheet) at the destination rows and columns (desRow, desCol)
function printToCells(sheet, desRow, desCol, arr){
  sheet.getRange(desRow, desCol, arr.length, arr[0].length).setValues(arr);
}

//  Function recursively iterates through the database (db) like a tree, drilling down to find the end nodes/ingredients starting from itemName.
//  itemQuant is simply a multiplier to all the quantities required.
function formIngredientList(db, itemName, itemQuant) {
  //  Lookup the array to find the required item, then move pointer to next row
  var pointer = getIndexOf(db, 1, itemName);
  var origPointer = getIndexOf(db, 1, itemName);
  var newQuant = Math.ceil(itemQuant/db[origPointer][3])
  pointer++;

  //  WHILE pointer row is an "I" or "R",
  //  if "I" (Ingredient), add to ingredientList
  //  if "R" (Recipe), recursively drill down until all ingredients are found and added to list in correct quantities.
  //  EDIT (2021-05-28): Modified to handle multiple outputs of a singular recipe.
  while (db[pointer][1] === "R" || db[pointer][1] === "I"){
    if (db[pointer][1] === "I"){
      ingredientList.push([db[pointer][2], db[pointer][3]*newQuant]);
    } else if (db[pointer][1] === "R"){
      formIngredientList(db, db[pointer][2], db[pointer][3]*newQuant);
    }
    pointer++;
  }
}

//  Function acts similarly to formIngredientList, but instead collects quantities of recipes required to craft.
function formRecipeList(db, itemName, itemQuant) {
  //  Lookup the array to find the required item, then move pointer to next row
  var pointer = getIndexOf(db, 1, itemName);
  var origPointer = getIndexOf(db, 1, itemName);
  var newQuant = Math.ceil(itemQuant/db[origPointer][3])
  pointer++;

  //  WHILE pointer row is an "I" or "R",
  //  if "I" (Ingredient), then do nothing
  //  if "R" (Recipe), then add correct # of recipes to recipeList and recursively drill down until all recipes are logged.
    while (db[pointer][1] === "R" || db[pointer][1] === "I"){
      if (db[pointer][1] === "R"){
        recipeList.push([db[pointer][2], db[pointer][3]*newQuant]);
        formRecipeList(db, db[pointer][2], db[pointer][3]*newQuant);
    }
    pointer++;
  }
}

//  Function is used to create a bottom-up crafting method to turn the giant crafting tree into a linear order.
function formRecipeOrder(db, recipeList){
  //  Create a dupe of the database(db) and recipe list (recipeList) as these will be modified during the function
  var duplicateDB = [...db];
  var uncraftedRecipes = [...recipeList];
  var craftedRecipes = [];
  var craftingOrder = 0;

  //  This while loop continues until there are no uncrafted recipes remaining
  //  1. Starting from the top, check to see if selected recipe is craftable (must have all ingredients ("I"), no uncrafted recipes ("R"))
  //  2. If craftable, add to craftedRecipes and convert all db instances of item where it is listed as a recipe ("R") to an ingredient ("I")
  //     Return index back to the top
  //  3. If not craftable, move down the list until a craftable recipe is found.
  //  4. Repeat until no uncrafted recipes remain.
  while(uncraftedRecipes.length != 0){
    for (var i = uncraftedRecipes.length-1; i >= 0; i--) {
      var pointer = getIndexOf(duplicateDB, 1, uncraftedRecipes[i][0])
      var craftable = true;
      pointer++;

      //  Step 1
      while (duplicateDB[pointer][1] === "R" || duplicateDB[pointer][1] === "I"){
        if (duplicateDB[pointer][1] === "I"){
          pointer++
        } else if (duplicateDB[pointer][1] === "R"){
          craftable = false;
          break;
        }
      }

      //  Step 2
      if (craftable === true){
        craftingOrder++;
        craftedRecipes.push([craftingOrder, uncraftedRecipes[i][0], uncraftedRecipes[i][1]]);
        //  replace all occurrences of crafted item as an ingredient in duplicateDB
        for (let j = 0; j < duplicateDB.length; j++){
          if (duplicateDB[j][2] === uncraftedRecipes[i][0] && duplicateDB[j][1] === "R"){
            duplicateDB[j][1] = "I";
          }
        }
        uncraftedRecipes.splice(i, 1);
        i = uncraftedRecipes.length;
      }
      //  Step 3
    }
    //  Step 4
  }
  return craftedRecipes;
}
