export type SnapDecision = "eligible" | "not-eligible"

// USDA SNAP purchase rules, applied only when the menu does not mark an item.
// https://www.fns.usda.gov/snap/eligible-food-items
export function snapFromRules(name: string, section: string, soldHot = false): SnapDecision {
  const food = name.toLowerCase()
  if (isHotAtSale(section, food, soldHot)) {
    return "not-eligible"
  }
  if (isAlcoholicBeverage(food) || isTobacco(food) || isControlledSubstance(food)) {
    return "not-eligible"
  }
  if (isSupplementOrMedicine(food) || isIneligibleLiveAnimal(food) || isNonfood(food)) {
    return "not-eligible"
  }
  return "eligible"
}

function isHotAtSale(section: string, food: string, soldHot: boolean) {
  if (
    /\b(hot sauce|hot dog|hot dogs|hot pepper|hot peppers|hot salsa|hot cheetos?)\b/.test(food)
  ) {
    return false
  }
  if (/\biced\b/.test(food) || /\b(coffee beans|ground coffee|coffee pods|instant coffee)\b/.test(food)) {
    return false
  }
  if (soldHot) {
    return true
  }
  if (/\b(hot coffee|hot tea|hot soup|hot chocolate|hot cocoa|latte|cappuccino|espresso|americano|mocha|rotisserie)\b/.test(food)) {
    return true
  }
  return /\b(hot bar|hot food|hot foods|hot case|steam table|hot entrees|hot meals)\b/.test(
    section.toLowerCase()
  )
}

function isAlcoholicBeverage(food: string) {
  if (
    /\b(beer battered|beer cheese|beer brat|wine sauce|wine vinegar|rum cake|bourbon chicken|vodka pasta|vodka sauce)\b/.test(
      food
    )
  ) {
    return false
  }
  const withoutSoda = food.replace(/\b(root beer|ginger beer|ginger ale)\b/g, " ")
  if (/\bhard (seltzer|cider|lemonade|tea|soda|kombucha)\b/.test(withoutSoda)) {
    return true
  }
  return /\b(beer|lager|stout|ipa|pilsner|porter|wine|liquor|whiskey|whisky|vodka|rum|tequila|gin|bourbon|brandy|champagne|prosecco|sake|mead|malt liquor|ale)\b/.test(
    withoutSoda
  )
}

function isTobacco(food: string) {
  return /\b(cigarettes?|cigars?|tobacco|nicotine|vapes?|juul|snuff|zyn)\b/.test(food)
}

function isControlledSubstance(food: string) {
  return /\b(cannabis|marijuana|cbd|thc|delta-8|delta 8)\b/.test(food)
}

function isSupplementOrMedicine(food: string) {
  if (/\bvitamin\s*water\b/.test(food)) {
    return false
  }
  return /\b(vitamins?|multivitamins?|supplements?|medicines?|medications?|ibuprofen|aspirin|tylenol|acetaminophen|melatonin|antibiotics?|cough syrup|nyquil|dayquil|benadryl|fish oil|creatine|collagen peptides|5-hour energy|energy shot)\b/.test(
    food
  )
}

function isIneligibleLiveAnimal(food: string) {
  if (!/\blive\b/.test(food)) {
    return false
  }
  return !/\b(lobsters?|crabs?|clams?|oysters?|mussels?|scallops?|shrimps?|crawfish|crayfish|shellfish|fish|salmon|trout|tilapia|cod|tuna|catfish)\b/.test(
    food
  )
}

function isNonfood(food: string) {
  return /\b(pet food|dog food|cat food|puppy food|kitten food|kibble|cat litter|bird ?seed|bleach|detergents?|fabric softener|cleaners?|paper towels?|toilet paper|napkins?|tissues|kleenex|trash bags|shampoos?|conditioners?|toothpastes?|deodorants?|lotions?|makeup|mascara|lipstick|cosmetics?|diapers?|tampons?|sanitary pads|razors?|dental floss|dish soap|hand soap|bar soap|body wash|sponges?|aluminum foil|plastic wrap|laundry|paper plates|houseplants?|bouquets?)\b/.test(
    food
  )
}
