/**
 * The prompt bank. Every poll Noct can ask, written for this game.
 *
 * Prompts are grouped by the climate band they belong to in the climb:
 * 0 the Moss Woods (home, small things, night), 1 the Amber Flats (travel,
 * heat, markets), 2 the Glass Tundra (cold, quiet, machines, habits) and
 * 3 the Ember Ridge (feeling, fear, celebration, the sky).
 *
 * Each prompt carries 14–16 answers in descending weight order, so the board
 * of nine, an off-board answer (Lantern) and a lonely one (Ember) all have a
 * place. Weights are authored shares of a hundred and normalised on build.
 */

export type Band = 0 | 1 | 2 | 3;

export type Row = [text: string, weight: number, aliases?: string[]];

export interface BankEntry {
  prompt: string;
  rows: Row[];
}

const p = (prompt: string, rows: Row[]): BankEntry => ({ prompt, rows });

const WOODS: BankEntry[] = [
  p('Something in a junk drawer', [
    ['Batteries', 23], ['Scissors', 17], ['Tape', 13], ['Pens', 11], ['Keys', 9],
    ['String', 7], ['Takeaway menu', 6], ['Glue', 5], ['Screws', 4], ['Rubber bands', 4],
    ['Matches', 3], ['Lighter', 3], ['Old phone', 2], ['Birthday candles', 2], ['Chopsticks', 1],
  ]),
  p('A chore people put off', [
    ['Ironing', 23], ['Dishes', 18], ['Laundry', 12], ['Cleaning the bathroom', 10], ['Taxes', 8],
    ['Dusting', 6], ['Mowing', 6], ['Folding clothes', 5], ['Cleaning windows', 4], ['Vacuuming', 4],
    ['Changing sheets', 3], ['Recycling', 3], ['Cleaning the oven', 2], ['Sorting the wardrobe', 2], ['Defrosting the freezer', 1],
  ]),
  p('Something you find in a pocket', [
    ['Lint', 24], ['Receipt', 17], ['Coins', 14], ['Phone', 10], ['Keys', 8],
    ['Tissue', 6], ['Pen', 5], ['Gum', 4], ['Hole', 3], ['Bus ticket', 3],
    ['Hair tie', 3], ['Sweet wrapper', 2], ['Pebble', 2], ['Earphones', 1], ['Shopping list', 1],
  ]),
  p('Something you always lose', [
    ['Keys', 23], ['Phone', 17], ['Socks', 12], ['Pen', 10], ['Lighter', 8],
    ['Hair tie', 7], ['Wallet', 6], ['Glasses', 5], ['Umbrella', 4], ['Earphones', 4],
    ['Remote', 3], ['Chapstick', 2], ['Sunglasses', 2], ['Gloves', 2], ['Bank card', 2],
  ]),
  p('Something you keep buying but never finish', [
    ['Milk', 20], ['Bread', 17], ['Shampoo', 12], ['Notebook', 9], ['Spices', 8],
    ['Candles', 7], ['Pens', 6], ['Chips', 5], ['Mustard', 4], ['Tea bags', 4],
    ['Lotion', 3], ['Rice', 2], ['Frozen peas', 2], ['Vitamins', 2], ['Hot sauce', 1],
  ]),
  p('A sound that wakes you up', [
    ['Alarm', 35], ['Dog', 13], ['Baby', 11], ['Traffic', 8], ['Neighbour', 7],
    ['Rain', 6], ['Phone', 5], ['Bird', 4], ['Doorbell', 3], ['Thunder', 3],
    ['Bin truck', 2], ['Building work', 2], ['Kettle', 1], ['Cat', 1], ['Snoring', 1],
  ]),
  p('Something in a kitchen drawer', [
    ['Spoons', 20], ['Scissors', 16], ['Whisk', 12], ['Bottle opener', 10], ['Tape', 8],
    ['Batteries', 7], ['Matches', 6], ['Napkins', 5], ['Takeaway menus', 4], ['Garlic press', 3],
    ['Measuring cups', 3], ['Chopsticks', 2], ['Straws', 2], ['Cling film', 1], ['Meat thermometer', 1],
  ]),
  p('A smell that reminds you of childhood', [
    ['Sunscreen', 17], ['Cut grass', 15], ['Baking', 14], ['Petrol', 8], ['Chlorine', 7],
    ['Crayons', 7], ['Rain', 6], ['Soap', 5], ['Playdough', 4], ['Fish fingers', 3],
    ['School glue', 3], ['Vicks', 2], ['New shoes', 2], ['Woodsmoke', 2], ['Sweets', 1],
  ]),
  p('Something people collect', [
    ['Stamps', 19], ['Coins', 17], ['Cards', 13], ['Shoes', 9], ['Books', 8],
    ['Mugs', 7], ['Records', 6], ['Keychains', 5], ['Shells', 3], ['Stones', 3],
    ['Teddy bears', 2], ['Tickets', 2], ['Snow globes', 2], ['Posters', 2], ['Magnets', 1],
  ]),
  p('A popular name for a dog', [
    ['Max', 17], ['Bella', 15], ['Charlie', 13], ['Lucy', 11], ['Rocky', 9],
    ['Daisy', 8], ['Milo', 7], ['Buddy', 6], ['Luna', 5], ['Cooper', 4],
    ['Poppy', 3], ['Teddy', 3], ['Alfie', 2], ['Bailey', 1], ['Rex', 1],
  ]),
  p('Something that breaks easily', [
    ['Glass', 22], ['Phone screen', 18], ['Egg', 13], ['Mirror', 8], ['Headphones', 7],
    ['Plate', 6], ['Toy', 5], ['Charger cable', 4], ['Vase', 4], ['Nail', 3],
    ['Heels', 3], ['Hairband', 2], ['Drone', 2], ['Umbrella', 2], ['Earbuds', 1],
  ]),
  p('Something you can hear at night', [
    ['Crickets', 19], ['Traffic', 15], ['Fridge', 11], ['Snoring', 10], ['Dog', 8],
    ['Wind', 7], ['Clock', 6], ['Neighbours', 5], ['Train', 3], ['Owl', 3],
    ['Pipes', 3], ['Cat', 2], ['Rain', 2], ['Phone buzz', 1], ['Foxes', 1],
  ]),
  p('Something you do when you cannot sleep', [
    ['Count sheep', 19], ['Scroll phone', 17], ['Read', 14], ['Watch TV', 11], ['Drink water', 8],
    ['Walk around', 7], ['Listen to music', 6], ['Stare at the ceiling', 5], ['Toss and turn', 4], ['Make tea', 3],
    ['Tidy up', 2], ['Write things down', 2], ['Meditate', 2], ['Eat', 1], ['Cry', 1],
  ]),
  p('A word you always misspell', [
    ['Necessary', 21], ['Definitely', 17], ['Separate', 13], ['Restaurant', 10], ['Tomorrow', 8],
    ['Believe', 7], ['Beautiful', 6], ['Receive', 5], ['Accommodate', 4], ['Rhythm', 3],
    ['Embarrass', 3], ['Occasion', 2], ['Maintenance', 2], ['Privilege', 1], ['Conscience', 1],
  ]),
  p('A game you can play with no equipment', [
    ['Tag', 20], ['Hide and seek', 17], ['20 questions', 13], ['Charades', 11], ['Truth or dare', 9],
    ['I spy', 8], ['Rock paper scissors', 7], ['Simon says', 4], ['Staring contest', 4], ['Marco polo', 3],
    ['Categories', 3], ['Would you rather', 2], ['Word association', 2], ['Sardines', 1], ['Twenty-one', 1],
  ]),
  p('Something in a first-aid kit', [
    ['Plasters', 26], ['Bandage', 17], ['Painkillers', 14], ['Scissors', 8], ['Antiseptic', 7],
    ['Gloves', 6], ['Tape', 5], ['Thermometer', 4], ['Gauze', 4], ['Tweezers', 3],
    ['Eye drops', 2], ['Burn cream', 2], ['Safety pins', 1], ['Cotton wool', 1], ['Ice pack', 1],
  ]),
  p('Something that makes you sneeze', [
    ['Pepper', 28], ['Dust', 22], ['Pollen', 14], ['Perfume', 8], ['Cats', 6],
    ['Sunlight', 5], ['Smoke', 4], ['Chilli', 3], ['Spray', 2], ['Grass', 2],
    ['Mould', 2], ['Cleaning products', 2], ['Cold air', 2], ['Feathers', 1], ['Ginger', 1],
  ]),
  p('Something people do when they are nervous', [
    ['Bite nails', 24], ['Pace', 16], ['Fidget', 12], ['Sweat', 10], ['Talk fast', 8],
    ['Laugh', 6], ['Check phone', 5], ['Tap foot', 4], ['Chew lip', 4], ['Shake leg', 3],
    ['Breathe deep', 2], ['Crack knuckles', 2], ['Hum', 2], ['Play with hair', 1], ['Drink water', 1],
  ]),
  p('A thing people do when they are bored', [
    ['Scroll phone', 24], ['Watch TV', 17], ['Nap', 12], ['Eat', 10], ['Pace around', 7],
    ['Doodle', 6], ['Clean', 5], ['Stare into space', 5], ['Call a friend', 3], ['Play games', 3],
    ['Daydream', 2], ['Sing', 2], ['Rearrange furniture', 2], ['Walk to the fridge', 1], ['Organise something', 1],
  ]),
  p('Something you would find in a hotel room', [
    ['Towel', 19], ['Bible', 14], ['Kettle', 12], ['TV', 11], ['Minibar', 9],
    ['Iron', 8], ['Slippers', 6], ['Hairdryer', 5], ['Remote', 4], ['Tea bags', 3],
    ['Notepad', 3], ['Shower cap', 2], ['Room service menu', 2], ['Safe', 2], ['Key card', 1],
  ]),
  p('A food people eat for breakfast', [
    ['Eggs', 21], ['Cereal', 18], ['Toast', 15], ['Bacon', 11], ['Coffee', 8],
    ['Pancakes', 6], ['Yoghurt', 5], ['Fruit', 4], ['Porridge', 3], ['Croissant', 3],
    ['Bagel', 2], ['Smoothie', 2], ['Omelette', 2], ['Granola', 1], ['Leftover pizza', 1],
  ]),
  p('Something that is always in a fridge', [
    ['Milk', 26], ['Butter', 18], ['Eggs', 14], ['Cheese', 10], ['Ketchup', 7],
    ['Vegetables', 6], ['Yoghurt', 5], ['Leftovers', 4], ['Beer', 3], ['Jam', 2],
    ['Juice', 2], ['Mayo', 2], ['Pickles', 2], ['Apples', 1], ['Half an onion', 1],
  ]),
  p('A place people go to be alone', [
    ['Bathroom', 20], ['Park', 15], ['Bedroom', 14], ['Beach', 9], ['Forest', 8],
    ['Car', 7], ['Library', 6], ['Shower', 5], ['Balcony', 4], ['Roof', 3],
    ['Cemetery', 3], ['Church', 2], ['Attic', 2], ['Sauna', 1], ['A bench', 1],
  ]),
  p('Something you can do in the rain', [
    ['Get wet', 22], ['Stay inside', 17], ['Use an umbrella', 14], ['Run', 10], ['Jump in puddles', 8],
    ['Read', 6], ['Sleep', 5], ['Dance', 4], ['Complain', 3], ['Sing', 3],
    ['Watch it fall', 3], ['Drive', 2], ['Play football', 1], ['Take photos', 1], ['Wash the car', 1],
  ]),
  p('A sound a baby makes', [
    ['Crying', 32], ['Laughing', 19], ['Babble', 13], ['Giggle', 9], ['Scream', 7],
    ['Coo', 5], ['Burp', 4], ['Sneeze', 3], ['Snore', 2], ['Hiccup', 2],
    ['Gurgle', 2], ['Shout', 1], ['Squeal', 1], ['Yawn', 1], ['Blow a raspberry', 1],
  ]),
  p('Something you only see at a wedding', [
    ['Cake', 22], ['Bride', 16], ['Rings', 12], ['Dancing', 10], ['Speech', 8],
    ['Flowers', 6], ['Wedding dress', 5], ['Tears', 4], ['Bouquet', 4], ['Aisle', 3],
    ['Confetti', 3], ['Toast', 2], ['Photographer', 2], ['First dance', 2], ['Seating plan', 1],
  ]),
  p('A word that is hard to say', [
    ['Worcestershire', 20], ['Squirrel', 16], ['Rural', 12], ['February', 10], ['Anemone', 8],
    ['Colonel', 7], ['Onomatopoeia', 6], ['Sixth', 5], ['Thorough', 4], ['Croissant', 4],
    ['Specific', 3], ['Isthmus', 2], ['Brewery', 2], ['Particularly', 1], ['Statistics', 1],
  ]),
  p('Something people do on a Sunday', [
    ['Sleep in', 20], ['Church', 15], ['Watch TV', 13], ['Cook a roast', 10], ['Walk', 9],
    ['Laundry', 8], ['Visit family', 6], ['Read the news', 5], ['Dread Monday', 4], ['Clean the house', 4],
    ['Football', 3], ['Brunch', 3], ['Garden', 2], ['Plan the week', 1], ['Do nothing', 1],
  ]),
  p('Something everyone lies about', [
    ['Age', 18], ['How they are', 16], ['Salary', 13], ['Reading the terms', 9], ['Going to the gym', 8],
    ['Their diet', 7], ['Their height', 5], ['Having read the book', 5], ['Their weekend', 4], ['Being busy', 4],
    ['Their sleep', 3], ['Cooking at home', 3], ['Screen time', 2], ['Knowing the song', 2], ['Liking the gift', 1],
  ]),
  p('A topping that ruins a pizza', [
    ['Pineapple', 30], ['Anchovy', 20], ['Olives', 13], ['Tuna', 8], ['Broccoli', 6],
    ['Corn', 5], ['Artichoke', 4], ['Egg', 3], ['Beetroot', 3], ['Tofu', 2],
    ['Peas', 2], ['Banana', 1], ['Chocolate', 1], ['Caviar', 1], ['Sultanas', 1],
  ]),
];

const FLATS: BankEntry[] = [
  p('Something you always forget to pack', [
    ['Charger', 25, ['phone charger', 'charging cable', 'charger cable']], ['Toothbrush', 17, ['tooth brush', 'brush']], ['Socks', 12, ['sock', 'pair of socks']], ['Sunscreen', 9, ['sun cream', 'sunblock', 'spf']], ['Passport', 8],
    ['Razor', 6], ['Towel', 5], ['Pyjamas', 4, ['pajamas']], ['Headphones', 4], ['Umbrella', 3],
    ['Toothpaste', 2], ['Comb', 2], ['Sandals', 1], ['Adapter', 1], ['Book', 1],
  ]),
  p('Something that is always in a car', [
    ['Spare tyre', 17, ['spare tire', 'wheel']], ['Phone charger', 15, ['charger', 'cable']], ['Water bottle', 12, ['water']], ['Sunglasses', 10], ['Coins', 8, ['change']],
    ['Umbrella', 7], ['Tissues', 6], ['Jumper', 5, ['jacket', 'sweater']], ['Maps', 4, ['map']], ['Parking ticket', 4],
    ['Ice scraper', 3], ['Hand sanitiser', 3], ['Snacks', 2], ['Dog hair', 2], ['Shopping bags', 2],
  ]),
  p('Something you do at the airport', [
    ['Wait', 24, ['waiting']], ['Security', 18, ['check security']], ['Eat', 12, ['food']], ['Shop', 10, ['duty free']], ['Sleep', 8],
    ['Run', 7, ['rush']], ['Check in', 6], ['Cry', 4], ['Read', 3], ['Charge phone', 2],
    ['Queue for coffee', 2], ['Watch planes', 1], ['Change money', 1], ['Lose luggage', 1], ['Panic', 1],
  ]),
  p('A place people go on holiday', [
    ['Beach', 30], ['Spain', 16], ['Mountains', 13], ['City', 10, ['cities']], ['Camping', 9],
    ['Island', 6], ['Lake', 5], ['Disneyland', 4], ['Farm', 2], ['Portugal', 2],
    ['Greece', 2], ['Italy', 1], ['Cruise', 1], ['Cabin', 1], ['Camper van', 1],
  ]),
  p('A reason to move to a new city', [
    ['Job', 30, ['work']], ['Love', 17, ['partner']], ['Study', 12, ['university']], ['Cheaper', 9, ['cost of living']], ['Family', 8],
    ['Weather', 6], ['Adventure', 5], ['Noise', 3, ['quiet']], ['Friends', 3], ['Better schools', 2],
    ['Transport', 2], ['Food', 2], ['Green space', 1], ['Healthcare', 1], ['Seaside', 1],
  ]),
  p('A reason to leave a party early', [
    ['Tired', 22], ['Work tomorrow', 18, ['work', 'early start']], ['Headache', 11], ['Bored', 10, ['boring']], ['Babysitter', 8, ['kids', 'childcare']],
    ['Argument', 6, ['fight']], ['Other plans', 5], ['Hungry', 4], ['Social battery', 4], ['Early flight', 3],
    ['Neighbour complaint', 2], ['Bad music', 2], ['Cold', 2], ['Someone said something', 1], ['Just wanted to', 1],
  ]),
  p('An excuse for being late', [
    ['Traffic', 30], ['Alarm', 19, ['slept in', 'overslept']], ['Bus', 11, ['public transport', 'train']], ['Parking', 8], ['Kids', 7, ['children']],
    ['Weather', 5, ['rain']], ['Lost track of time', 5], ['Dog', 3], ['Lift broke', 3], ['Wrong address', 2],
    ['Spilled coffee', 2], ['Phone died', 1], ['Locked out', 1], ['Roadworks', 1], ['Tube delay', 1],
  ]),
  p('Something you do at the beach', [
    ['Swim', 26, ['swimming']], ['Sunbathe', 18, ['sunbathing']], ['Build sandcastles', 13, ['sandcastle', 'sand castles']], ['Surf', 10, ['surfing']], ['Walk', 8],
    ['Eat ice cream', 7, ['ice cream']], ['Read', 5], ['Collect shells', 4, ['shells']], ['Play volleyball', 3], ['Watch the sunset', 3],
    ['Bury someone', 2], ['Look for crabs', 2], ['Fly a kite', 2], ['Get sunburnt', 2], ['Lose a flip-flop', 1],
  ]),
  p('Something you bring to a picnic', [
    ['Blanket', 24], ['Food', 20, ['sandwiches', 'snacks']], ['Drinks', 13, ['water', 'juice']], ['Basket', 9], ['Sunscreen', 7],
    ['Frisbee', 6], ['Napkins', 4], ['Hat', 3], ['Music', 2, ['speaker']], ['Ball', 2],
    ['Bug spray', 2], ['Cutlery', 2], ['Cool box', 2], ['Kite', 1], ['Dog', 1],
  ]),
  p('A food you eat with your hands', [
    ['Pizza', 23], ['Chips', 16, ['fries']], ['Burger', 14], ['Sandwich', 10], ['Wings', 9, ['chicken wings']],
    ['Fruit', 7, ['apple', 'banana']], ['Sushi', 6], ['Popcorn', 5], ['Tacos', 3], ['Doughnut', 3],
    ['Ice cream cone', 2], ['Ribs', 2], ['Corn on the cob', 2], ['Kebab', 2], ['Samosa', 1],
  ]),
  p('A food that tastes better cold', [
    ['Pizza', 24, ['leftover pizza']], ['Fried chicken', 12, ['chicken']], ['Cake', 11], ['Pasta', 9], ['Soup', 7],
    ['Coffee', 6], ['Rice', 5], ['Fries', 5, ['chips']], ['Chocolate', 4], ['Watermelon', 3],
    ['Lasagne', 3], ['Curry', 2], ['Noodles', 2], ['Pie', 2], ['Toast', 1],
  ]),
  p('A fruit that is hard to open', [
    ['Pineapple', 28], ['Coconut', 22], ['Pomegranate', 14], ['Mango', 9], ['Durian', 6],
    ['Melon', 5], ['Kiwi', 3], ['Orange', 2], ['Jackfruit', 2], ['Passion fruit', 2],
    ['Walnut', 1], ['Lychee', 1], ['Avocado', 1], ['Grapefruit', 1], ['Satsuma', 1],
  ]),
  p('A place where people queue', [
    ['Supermarket', 24, ['shop', 'grocery store']], ['Airport', 17], ['Bank', 12], ['Bus stop', 10, ['bus']], ['Post office', 8],
    ['Theme park', 7, ['rollercoaster']], ['Cafe', 6, ['coffee shop']], ['Clinic', 5, ['doctor']], ['Bakery', 4], ['Petrol station', 3],
    ['Cinema', 2], ['Club', 2], ['Ticket office', 2], ['Pharmacy', 2], ['Border', 1],
  ]),
  p('Something in a backpack', [
    ['Laptop', 21], ['Water bottle', 17, ['water']], ['Books', 13, ['book']], ['Snacks', 10, ['food']], ['Charger', 8, ['cable']],
    ['Headphones', 7], ['Notebook', 6], ['Jacket', 5], ['Keys', 4], ['Pen', 3],
    ['Tissues', 2], ['Passport', 2], ['Umbrella', 2], ['Sunglasses', 1], ['Loose receipts', 1],
  ]),
  p('A reason to cancel plans', [
    ['Sick', 27, ['ill', 'illness']], ['Tired', 17], ['Work', 12], ['Weather', 9, ['rain', 'snow']], ['Money', 7, ['broke']],
    ['Family', 6], ['Forgot', 5], ['Anxiety', 4, ['social anxiety']], ['No babysitter', 3, ['kids']], ['Double booked', 3],
    ['Car broke', 2], ['Too far', 2], ['Just not feeling it', 2], ['Hangover', 1], ['Pet sick', 1],
  ]),
  p('Something you regret buying', [
    ['Clothes', 19], ['Gym membership', 17, ['gym']], ['Gadget', 13, ['gadgets']], ['Shoes', 10], ['Subscription', 8],
    ['Book', 7], ['Plant', 6], ['Diet food', 5, ['diet food']], ['Fancy blender', 3], ['Novelty gift', 3],
    ['Sofa', 2], ['Course', 2], ['Drone', 2], ['Timeshare', 1], ['Yoga mat', 1],
  ]),
  p('Something on a bucket list', [
    ['Travel', 28, ['travel the world', 'travelling']], ['Skydive', 17, ['skydiving']], ['Northern lights', 11, ['aurora']], ['Learn a language', 9], ['Write a book', 8],
    ['Run a marathon', 6], ['Buy a house', 5], ['Swim with dolphins', 4], ['See a volcano', 3], ['Safari', 3],
    ['Learn an instrument', 2], ['Live abroad', 1], ['Hot air balloon', 1], ['Bungee jump', 1], ['Meet an idol', 1],
  ]),
  p('A job people wanted as a kid', [
    ['Astronaut', 25], ['Firefighter', 18, ['fireman']], ['Doctor', 14], ['Pilot', 11], ['Teacher', 7],
    ['Police officer', 6, ['police', 'cop']], ['Vet', 5, ['veterinarian']], ['Footballer', 4, ['soccer player']], ['Actor', 3], ['Singer', 2],
    ['Ballerina', 2], ['Chef', 2], ['Spy', 2], ['Builder', 1], ['Scientist', 1],
  ]),
  p('Something you keep in the car', [
    ['Phone charger', 21, ['charger', 'cable']], ['Sunglasses', 17], ['Umbrella', 13], ['Water bottle', 10, ['water']], ['Tissues', 8],
    ['Snacks', 6], ['Maps', 5, ['map']], ['Coins', 4], ['Jacket', 3], ['Ice scraper', 3],
    ['Parking change', 2], ['Hand cream', 2], ['Shopping bags', 2], ['Dog lead', 2], ['Spare shoes', 1],
  ]),
  p('Something that makes a hot day better', [
    ['Cold drink', 26], ['Shade', 18], ['Ice cream', 15], ['Fan', 11], ['Swimming', 9],
    ['Air conditioning', 7], ['Watermelon', 5], ['Cold shower', 4], ['Hat', 3], ['Shorts', 2],
    ['Lemonade', 2], ['Sea breeze', 2], ['Ice lolly', 2], ['Hosing yourself down', 1], ['A nap', 1],
  ]),
  p('A street food you would queue for', [
    ['Tacos', 20], ['Pizza slice', 15], ['Kebab', 13], ['Dumplings', 11], ['Noodles', 9],
    ['Burgers', 8], ['Crepes', 6], ['Falafel', 5], ['Empanadas', 4], ['Churros', 4],
    ['Hot dogs', 3], ['Satay', 2], ['Bao buns', 2], ['Corn on the cob', 2], ['Samosas', 2],
  ]),
  p('Something you take photos of on holiday', [
    ['Sunset', 24], ['Food', 16], ['Landmarks', 13], ['Family', 10], ['Beach', 8],
    ['Street signs', 5], ['Cats', 4], ['Architecture', 4], ['Sky', 3], ['Selfies', 3],
    ['Flowers', 2], ['Dogs', 2], ['Water', 2], ['Market stalls', 1], ['Menu', 1],
  ]),
  p('A souvenir people bring home', [
    ['Magnet', 22], ['Keyring', 17], ['Postcard', 12], ['Mug', 10], ['T-shirt', 9],
    ['Tea towel', 6], ['Snow globe', 5], ['Local snack', 4], ['Shell', 3], ['Shot glass', 3],
    ['Sand', 2], ['Hat', 2], ['Art print', 2], ['Coin', 1], ['Map', 1],
  ]),
  p('Something that ruins a road trip', [
    ['Traffic', 23], ['Car trouble', 17], ['Getting lost', 12], ['Rain', 9], ['Motion sickness', 8],
    ['Argument', 7], ['No snacks', 5], ['Bladder', 4], ['Wrong playlist', 3], ['Toll roads', 3],
    ['Potholes', 2], ['Sun glare', 2], ['No signal', 2], ['Long detour', 1], ['Someone snoring', 1],
  ]),
  p('A thing you always overpack', [
    ['Shoes', 21], ['Clothes', 19], ['Books', 11], ['Chargers', 9], ['Toiletries', 8],
    ['Snacks', 6], ['Jackets', 5], ['Socks', 4], ['Towels', 3], ['Makeup', 3],
    ['Hair stuff', 2], ['Swimwear', 2], ['Headphones', 2], ['Medicine', 1], ['Camera', 1],
  ]),
  p('A place you would go for a long weekend', [
    ['Beach', 22], ['Mountains', 16], ['City', 13], ['Lake', 9], ['Cabin', 8],
    ['Spa', 6], ['Island', 5], ['Campsite', 4], ['Vineyard', 3], ['Old town', 3],
    ['Hot springs', 2], ['Farm', 2], ['Desert', 2], ['Hostel', 1], ['Another country', 1],
  ]),
  p('Something you do at a market', [
    ['Haggle', 20], ['Sample food', 17], ['Buy fruit', 13], ['Browse', 10], ['Take photos', 8],
    ['Smell spices', 6], ['Buy flowers', 5], ['Chat to sellers', 4], ['Get lost', 4], ['Buy something useless', 3],
    ['Drink coffee', 3], ['Listen to buskers', 2], ['Count your change', 2], ['Buy bread', 2], ['Avoid eye contact', 1],
  ]),
  p('A drink that tastes better in summer', [
    ['Lemonade', 22], ['Iced coffee', 17], ['Watermelon juice', 11], ['Beer', 10], ['Iced tea', 8],
    ['Smoothie', 6], ['Coconut water', 5], ['Cold water', 5], ['Cola', 4], ['Prosecco', 3],
    ['Mojito', 3], ['Orange juice', 2], ['Milkshake', 2], ['Sangria', 1], ['Ginger beer', 1],
  ]),
  p('Something you would miss about home when travelling', [
    ['Your bed', 22], ['Family', 17], ['Food', 13], ['Friends', 9], ['Your shower', 8],
    ['Your dog', 7], ['The weather', 5], ['Your language', 4], ['Silence', 3], ['The tap water', 3],
    ['Your sofa', 2], ['The bus', 2], ['Your pillow', 2], ['Sunday routine', 1], ['Your own mug', 1],
  ]),
  p('A language you wish you spoke', [
    ['Spanish', 24], ['French', 18], ['Japanese', 12], ['Italian', 10], ['German', 8],
    ['Mandarin', 6], ['Portuguese', 5], ['Arabic', 4], ['Korean', 4], ['Russian', 2],
    ['Sign language', 2], ['Norwegian', 1], ['Hindi', 1], ['Greek', 1], ['Swahili', 1],
  ]),
  // FLATS-END
];

const TUNDRA: BankEntry[] = [
  p('Something with a screen', [
    ['Phone', 28, ['mobile']], ['TV', 20, ['television']], ['Laptop', 12, ['computer']], ['Tablet', 9, ['ipad']], ['Watch', 7, ['smartwatch']],
    ['Microwave', 5], ['Car', 4], ['Cinema', 3, ['movie theatre']], ['E-reader', 3], ['Nintendo Switch', 2],
    ['ATM', 2], ['Fridge', 1], ['Doorbell', 1], ['Satnav', 1], ['Vending machine', 1],
  ]),
  p('A show almost everyone has seen', [
    ['Friends', 20], ['The Office', 16], ['Game of Thrones', 13], ['Breaking Bad', 10], ['Stranger Things', 9],
    ['The Simpsons', 7], ['Squid Game', 6], ['SpongeBob', 4], ['Peaky Blinders', 3], ['Sherlock', 3],
    ['The Crown', 2], ['Doctor Who', 2], ['Money Heist', 2], ['Brooklyn Nine-Nine', 2], ['Cheers', 1],
  ]),
  p('Something that is always cold', [
    ['Ice', 19], ['Fridge', 17], ['Freezer', 14], ['Winter', 10], ['Water', 8, ['cold water']],
    ['Beer', 7], ['Snow', 6], ['Hands', 5], ['Wine cellar', 3], ['Marble floor', 3],
    ['North pole', 2], ['Air conditioning', 2], ['Milk', 2], ['Metal railing', 1], ['A cellar', 1],
  ]),
  p('A sport played with a ball', [
    ['Football', 28, ['soccer']], ['Basketball', 19], ['Tennis', 14], ['Baseball', 10], ['Golf', 7],
    ['Rugby', 4], ['Cricket', 3], ['Volleyball', 3], ['Bowling', 2], ['Handball', 2],
    ['Table tennis', 2], ['Pool', 1], ['Netball', 1], ['Hockey', 1], ['Squash', 1],
  ]),
  p('A thing that only works when it is charged', [
    ['Phone', 30, ['mobile']], ['Laptop', 18], ['Toothbrush', 11], ['Watch', 8], ['Headphones', 7],
    ['Drill', 3], ['Vacuum', 3], ['Car', 3], ['Shaver', 3], ['Speaker', 2],
    ['Camera', 2], ['Bike light', 2], ['Scooter', 2], ['Doorbell', 2], ['Toy', 1],
  ]),
  p('Something you would take to a desert island', [
    ['Water', 20], ['Knife', 17], ['A boat', 12], ['Rope', 8], ['Fire starter', 7],
    ['Fishing rod', 6], ['Sunscreen', 5], ['Book', 4], ['Tent', 4], ['Friend', 3],
    ['Phone', 2], ['Snacks', 2], ['Radio', 2], ['Dog', 2], ['Guitar', 1],
  ]),
  p('A sound you hear in a quiet room', [
    ['Fridge hum', 24], ['Clock', 18], ['Pipes', 12], ['Breathing', 9], ['Light buzzing', 8],
    ['Neighbours TV', 6], ['Wind', 5], ['Distant traffic', 4], ['Floorboards', 3], ['Phone buzz', 3],
    ['Kettle', 2], ['Rain', 2], ['Birds', 2], ['Your own heartbeat', 1], ['Chair creak', 1],
  ]),
  p('Something that makes winter harder', [
    ['Ice', 21], ['Dark evenings', 17], ['Cold', 13], ['Short days', 9], ['Heating bills', 8],
    ['Slippery pavements', 6], ['Dry skin', 4], ['Waking up', 4], ['Traffic', 3], ['Wet shoes', 3],
    ['Getting ill', 2], ['Bad drivers', 2], ['Laundry', 2], ['Frozen windscreen', 1], ['Power cuts', 1],
  ]),
  p('A small thing that ruins your morning', [
    ['No coffee', 19], ['Slept through the alarm', 15], ['Phone dead', 11], ['Missing sock', 8], ['Traffic', 7],
    ['Spilled drink', 6], ['Running out of milk', 5], ['Rain', 4], ['Headache', 4], ['Flat tyre', 3],
    ['Bad hair', 3], ['A text', 2], ['No hot water', 2], ['Lost keys', 2], ['Email', 1],
  ]),
  p('Something you do when the internet is down', [
    ['Read', 20], ['Sleep', 14], ['Clean', 12], ['Go for a walk', 10], ['Complain', 8],
    ['Play a board game', 7], ['Cook', 6], ['Check the router', 5], ['Call a friend', 4], ['Stare at the screen', 4],
    ['Do a puzzle', 3], ['Tidy the desk', 2], ['Text your provider', 2], ['Panic', 2], ['Talk to family', 1],
  ]),
  p('An app you open every day', [
    ['Instagram', 22], ['WhatsApp', 18], ['YouTube', 13], ['Spotify', 9], ['TikTok', 8],
    ['Weather', 6], ['News', 5], ['Maps', 3], ['Bank', 3], ['Calendar', 2],
    ['Gmail', 2], ['Duolingo', 2], ['Reddit', 2], ['Camera', 1], ['Clock', 1],
  ]),
  p('A thing people say when they are cold', [
    ['Freezing', 24], ['Cold', 15], ['Frozen', 13], ['Snowing', 8], ['Chilly', 7],
    ['Baltic', 6], ['Nippy', 5], ['Miserable', 4], ['Put a jumper on', 4], ['Raining', 3],
    ['Winter', 3], ['Windy', 2], ['Damp', 2], ['Grim', 2], ['Heaters', 1],
  ]),
  p('Something that looks better in the snow', [
    ['Trees', 22], ['Mountains', 18], ['A village', 13], ['Lamp posts', 9], ['Fields', 7],
    ['Roofs', 6], ['Statues', 4], ['A castle', 3], ['Cars', 3], ['Garden', 2],
    ['Street lights', 2], ['Rivers', 2], ['Benches', 1], ['Fences', 1], ['Dogs', 1],
  ]),
  p('A smell you only notice in winter', [
    ['Woodsmoke', 26], ['Snow', 18], ['Wet wool', 11], ['Pine', 9], ['Central heating', 6],
    ['Soup', 5], ['Frost', 4], ['Mulled wine', 3], ['Cinnamon', 3], ['Cold air', 2],
    ['Rain on coats', 2], ['Gingerbread', 2], ['Lanolin', 1], ['Boiled potatoes', 1], ['Damp gloves', 1],
  ]),
  p('Something you wear when it is freezing', [
    ['Coat', 24], ['Scarf', 18], ['Gloves', 12], ['Hat', 10], ['Boots', 8],
    ['Thermals', 6], ['Jumper', 4], ['Ear muffs', 4], ['Two pairs of socks', 3], ['Balaclava', 2],
    ['Snow trousers', 2], ['Fleece', 2], ['Leggings', 1], ['Vest', 1], ['Blanket', 1],
  ]),
  p('A place that is always quiet', [
    ['Library', 26], ['Church', 16], ['Forest', 12], ['Museum', 8], ['Hospital', 6],
    ['Cemetery', 5], ['Mountains', 5], ['Early morning street', 4], ['Your own room', 3], ['Sauna', 2],
    ['Bank', 2], ['Gallery', 2], ['Monastery', 2], ['Canal', 2], ['Desert', 2],
  ]),
  p('Something that takes longer than you expect', [
    ['Traffic', 18], ['A haircut', 10], ['Boiling water', 8], ['Doctor visit', 7], ['IKEA', 7],
    ['Customer service', 6], ['Airport security', 5], ['Laundry', 5], ['Assembling furniture', 4], ['A phone call', 4],
    ['Dying hair', 3], ['Painting a room', 3], ['Baking bread', 3], ['Online forms', 2], ['A bus', 2],
  ]),
  p('A thing you would never do in public', [
    ['Sing', 22], ['Dance', 16], ['Cry', 11], ['Argue', 9], ['Pick your nose', 7],
    ['Change clothes', 6], ['Eat loudly', 5], ['Take a selfie', 4], ['Practise a speech', 3], ['Floss', 3],
    ['Karaoke', 2], ['Talk to yourself', 2], ['Burp', 2], ['Nap', 2], ['Trim nails', 1],
  ]),
  p('Something you can do for an hour without noticing', [
    ['Scroll phone', 24], ['Watch TV', 18], ['Read', 12], ['Play games', 10], ['Talk', 7],
    ['Cook', 5], ['Draw', 4], ['Walk', 4], ['Clean', 3], ['Listen to music', 3],
    ['Drive', 2], ['Garden', 2], ['Puzzle', 2], ['Shop online', 2], ['Daydream', 2],
  ]),
  p('A sign that you are getting old', [
    ['Back pain', 22], ['Early nights', 15], ['Saying the youth is loud', 11], ['Needing glasses', 9], ['Preferring quiet', 7],
    ['Forgetting names', 6], ['Buying sensible shoes', 5], ['Talking about weather', 4], ['Not knowing new music', 4], ['Going to bed at nine', 3],
    ['Groaning when standing', 3], ['Keeping receipts', 2], ['Liking the news', 2], ['Back in my day', 2], ['Socks as gifts', 1],
  ]),
  p('Something people pretend to understand', [
    ['Wine', 18], ['Football rules', 13], ['Art', 11], ['Taxes', 10], ['The stock market', 9],
    ['Politics', 8], ['Crypto', 7], ['Cars', 6], ['Coffee', 5], ['Fashion', 4],
    ['Poetry', 3], ['Philosophy', 3], ['Grammar', 2], ['The news', 2], ['Other people', 2],
  ]),
  p('The best thing about a snow day', [
    ['No school', 26], ['Staying in', 18], ['Hot drinks', 12], ['Snowmen', 9], ['Sledding', 7],
    ['Quiet streets', 5], ['Snowball fights', 4], ['Fresh snow', 3], ['Photos', 3], ['Day off work', 3],
    ['Blanket', 2], ['Soup', 2], ['Watching it fall', 2], ['Dogs', 2], ['Sleeping in', 2],
  ]),
  p('A piece of advice you ignore', [
    ['Drink more water', 24], ['Sleep more', 17], ['Stretch', 11], ['Save money', 9], ['Floss', 6],
    ['Take the stairs', 5], ['Meal prep', 5], ['Back up your files', 4], ['Learn a language', 3], ['Get up early', 3],
    ['Sit up straight', 2], ['Read the terms', 2], ['Apply sunscreen', 2], ['Ask for help', 2], ['Walk more', 2],
  ]),
  p('Something that is harder than it looks', [
    ['Ice skating', 21], ['Public speaking', 16], ['Making bread', 11], ['Parallel parking', 9], ['Golf', 7],
    ['Parenting', 6], ['Yoga', 5], ['Drawing hands', 4], ['Small talk', 4], ['Fixing a bike', 3],
    ['Cutting hair', 3], ['Chess', 2], ['Pasta from scratch', 2], ['Swimming laps', 2], ['Tying a tie', 2],
  ]),
  p('A small victory you celebrate', [
    ['Finding parking', 22], ['Catching the bus', 16], ['A clean inbox', 11], ['Beating traffic', 8], ['Finishing a to-do list', 6],
    ['Free coffee', 5], ['A compliment', 4], ['Finding a tenner', 4], ['Cooking dinner', 3], ['Remembering a name', 3],
    ['No queue', 3], ['A green light', 2], ['An early night', 2], ['Saved password', 2], ['A tidy desk', 2],
  ]),
  p('Something you would rather not know', [
    ['What people say behind your back', 24], ['Your search history', 14], ['Calories in a pizza', 11], ['How sausages are made', 9], ['Your screen time', 7],
    ['The ending of a film', 6], ['The price of your house', 5], ['What your phone hears', 4], ['A birthday surprise', 4], ['Your bank balance', 3],
    ['How old your dog is in human years', 3], ['The ingredients in a hot dog', 3], ['Your sleep stats', 2], ['Who unfollowed you', 2], ['The news', 2],
  ]),
  p('A thing you do out of habit', [
    ['Check your phone', 26], ['Lock the door twice', 15], ['Wash your hands', 10], ['Say sorry', 7], ['Pause a show', 5],
    ['Turn the kettle on', 4], ['Tap your pockets', 4], ['Look in the fridge', 3], ['Check the time', 3], ['Take a shortcut', 3],
    ['Straighten a picture', 2], ['Say goodbye twice', 2], ['Bite your pen', 2], ['Count stairs', 2], ['Hum', 2],
  ]),
  p('Something you would queue overnight for', [
    ['Concert tickets', 24], ['A new phone', 15], ['A sneaker drop', 12], ['A book launch', 9], ['Theatre tickets', 7],
    ['A restaurant opening', 6], ['A sample sale', 5], ['Festival wristbands', 4], ['A film premiere', 4], ['A limited toy', 2],
    ['A bakery first batch', 2], ['A football final', 2], ['A gig', 2], ['A sale', 2], ['A vaccine', 2],
  ]),
  p('Something that is better in theory than in practice', [
    ['Camping', 20], ['Working from home', 15], ['A big salad', 11], ['Diets', 9], ['Group projects', 8],
    ['Adulting', 6], ['Meetings', 5], ['New year resolutions', 5], ['IKEA flat packs', 4], ['3D films', 4],
    ['A juice cleanse', 3], ['Karaoke', 3], ['Snow', 2], ['DIY', 2], ['Online dating', 2],
  ]),
  p('Something you always check twice', [
    ['The door lock', 22], ['Your phone', 16], ['Your pockets', 11], ['The oven', 9], ['Spelling', 7],
    ['The weather', 6], ['Your bag', 5], ['Bank balance', 4], ['A bill', 4], ['Directions', 3],
    ['Email recipients', 3], ['Your keys', 3], ['The time', 2], ['A recipe', 2], ['Your reflection', 2],
  ]),
  // TUNDRA-END
];

const RIDGE: BankEntry[] = [
  p('Something you would never lend a friend', [
    ['Car', 22], ['Toothbrush', 16, ['tooth brush']], ['Phone', 14], ['Money', 11, ['cash']], ['Laptop', 8, ['computer']],
    ['Clothes', 7], ['Headphones', 5], ['Bike', 3, ['bicycle']], ['Book', 3], ['Charger', 3],
    ['Camera', 2], ['Bank card', 2], ['Shoes', 2], ['Towel', 1], ['Lighter', 1],
  ]),
  p('Something that makes you angry', [
    ['Traffic jams', 20], ['Being lied to', 16], ['Slow internet', 11], ['Queue jumpers', 9], ['Loud chewing', 7],
    ['Being ignored', 5], ['Mess', 5], ['Bad drivers', 4], ['Unfairness', 4], ['Spam calls', 3],
    ['Rude service', 3], ['Litter', 2], ['Lateness', 2], ['Group chats', 2], ['Losing a sock', 1],
  ]),
  p('Something that makes you cry', [
    ['Sad films', 22], ['Onions', 14], ['Weddings', 11], ['Songs', 9], ['Goodbyes', 8],
    ['Stress', 6], ['Laughter', 5], ['Adverts', 4], ['Dogs', 4], ['Being tired', 3],
    ['Old photos', 3], ['Funerals', 2], ['A hug', 2], ['Books', 2], ['Sport', 1],
  ]),
  p('A thing you are afraid of', [
    ['Spiders', 26], ['Heights', 17], ['Public speaking', 12], ['The dark', 9], ['Deep water', 7],
    ['Needles', 6], ['Clowns', 4], ['Flying', 4], ['Snakes', 3], ['Enclosed spaces', 3],
    ['Wasps', 2], ['The unknown', 2], ['Failure', 2], ['Dogs', 1], ['Silence', 1],
  ]),
  p('Something that makes a party good', [
    ['Good music', 22], ['Good people', 17], ['Food', 12], ['Drinks', 9], ['Dancing', 8],
    ['Games', 5], ['A good host', 5], ['The venue', 3], ['A theme', 3], ['No drama', 3],
    ['A garden', 2], ['A fire', 2], ['Singing', 2], ['Cake', 2], ['Photos', 1],
  ]),
  p('A reason to throw a party', [
    ['Birthday', 32], ['Wedding', 17], ['New job', 9], ['Promotion', 6], ['Moving house', 5],
    ['New baby', 4], ['Anniversary', 4], ['Graduation', 4], ['Just because', 3], ['A win', 3],
    ['Retirement', 2], ['Housewarming', 2], ['Exam finished', 2], ['A holiday', 2], ['Tuesday', 1],
  ]),
  p('Something you would do with a free afternoon', [
    ['Sleep', 24], ['Walk', 15], ['Read', 11], ['Meet a friend', 9], ['Cook', 7],
    ['Shop', 5], ['Watch a film', 5], ['Garden', 3], ['Clean', 3], ['Swim', 3],
    ['Draw', 2], ['Game', 2], ['Drive', 2], ['Bake', 2], ['Nothing', 2],
  ]),
  p('A feeling you get in a crowd', [
    ['Nervous', 18], ['Excited', 16], ['Lonely', 12], ['Hot', 10], ['Anonymous', 9],
    ['Claustrophobic', 7], ['Energised', 5], ['Tired', 5], ['Happy', 4], ['Overwhelmed', 4],
    ['Sticky', 2], ['Hungry', 2], ['Impatient', 2], ['Frustrated', 2], ['Self-conscious', 2],
  ]),
  p('Something that gives you hope', [
    ['Sunrise', 24], ['Good news', 17], ['Kind strangers', 13], ['Young people', 9], ['Progress', 7],
    ['A warm day', 5], ['A text from a friend', 5], ['Rain after drought', 4], ['A good song', 3], ['A dog', 3],
    ['A plan', 2], ['Books', 2], ['Sport', 2], ['Second chances', 2], ['Laughter', 2],
  ]),
  p('Something that scares you about the future', [
    ['Climate', 24], ['Money', 17], ['Health', 12], ['Loneliness', 9], ['Technology', 7],
    ['Losing people', 6], ['War', 5], ['Work', 4], ['Not being enough', 4], ['The news', 3],
    ['Robots', 3], ['Housing', 2], ['Getting old', 2], ['Elections', 1], ['The unknown', 1],
  ]),
  p('A thing you would do for a million', [
    ['Quit your job', 22], ['Travel', 18], ['Buy a house', 13], ['Help family', 10], ['Sleep', 7],
    ['Give some away', 5], ['Start a business', 4], ['Buy a car', 4], ['Move abroad', 3], ['Cry', 3],
    ['Learn to fly', 2], ['Retire', 2], ['Invest', 2], ['Nothing', 2], ['Panic', 2],
  ]),
  p('Something that melts your heart', [
    ['Puppies', 26], ['Babies', 18], ['Old couples', 12], ['A child drawing', 8], ['Kindness', 7],
    ['A rescue story', 6], ['Tiny shoes', 4], ['A sleepy cat', 3], ['A handwritten note', 3], ['Grandparents', 3],
    ['A first word', 2], ['A reunion', 2], ['An apology', 2], ['A hug', 2], ['A hedgehog', 1],
  ]),
  p('Something people do when they are in love', [
    ['Smile', 22], ['Text constantly', 17], ['Buy gifts', 12], ['Talk about them', 9], ['Get jealous', 7],
    ['Cook', 5], ['Plan trips', 4], ['Share food', 4], ['Lose sleep', 3], ['Write poems', 3],
    ['Check their profile', 3], ['Sing', 2], ['Forget friends', 2], ['Dress up', 2], ['Dance', 2],
  ]),
  p('Something that makes a house feel like home', [
    ['A smell', 22], ['A pet', 16], ['Family', 12], ['Your own bed', 9], ['Photos', 7],
    ['Cooking', 5], ['A favourite chair', 4], ['Books', 4], ['Plants', 3], ['Noise', 3],
    ['Warmth', 2], ['Your mug', 2], ['A rug', 2], ['Music', 2], ['A garden', 2],
  ]),
  p('A thing you would say to your younger self', [
    ['Do not worry', 24], ['Save money', 16], ['Be braver', 12], ['Enjoy it', 9], ['Study harder', 7],
    ['Nobody is watching', 5], ['Sleep more', 5], ['Trust yourself', 4], ['Say yes', 3], ['Say no', 3],
    ['Travel', 2], ['Read more', 2], ['Be kind', 2], ['It gets better', 2], ['Wear sunscreen', 2],
  ]),
  p('Something that makes you laugh every time', [
    ['A dog video', 22], ['Someone falling over', 16], ['A funny accent', 11], ['Your own joke', 8], ['A baby laughing', 7],
    ['A misheard song', 5], ['A good pun', 5], ['A meme', 4], ['Sneezing', 3], ['A friend story', 3],
    ['A cat', 3], ['A typo', 2], ['An advert', 2], ['A prank', 2], ['Nothing', 2],
  ]),
  p('A thing you do when you are happy', [
    ['Smile', 26], ['Sing', 16], ['Dance', 12], ['Call someone', 9], ['Cook', 7],
    ['Buy something', 5], ['Hug', 5], ['Cry', 3], ['Jump', 3], ['Treat yourself', 3],
    ['Go for a walk', 3], ['Talk faster', 2], ['Laugh at everything', 2], ['Take photos', 2], ['Share it', 2],
  ]),
  p('Something you would never admit out loud', [
    ['Your screen time', 20], ['Singing badly', 14], ['Talking to yourself', 11], ['Checking an ex profile', 9], ['Liking a bad film', 7],
    ['Loving a snack', 6], ['Forgetting a name', 5], ['Reading spoilers', 4], ['Checking someones profile', 4], ['Not liking a gift', 3],
    ['Crying at an advert', 3], ['Being scared', 2], ['Copying someone', 2], ['Googling yourself', 2], ['Sleeping with a teddy', 1],
  ]),
  p('A small thing that makes your day', [
    ['A green light', 20], ['Finding money in a pocket', 16], ['A compliment', 12], ['Good coffee', 9], ['A text from a friend', 8],
    ['A sunny morning', 6], ['A parking spot', 5], ['A dog', 4], ['Free food', 4], ['A clean desk', 3],
    ['No traffic', 3], ['A good song', 2], ['A nap', 2], ['A thank you', 2], ['A dry walk', 1],
  ]),
  p('Something that makes a long journey better', [
    ['Music', 24], ['A good book', 16], ['Snacks', 12], ['A window seat', 9], ['Sleep', 8],
    ['A podcast', 6], ['Company', 5], ['A game', 4], ['A blanket', 3], ['Coffee', 3],
    ['A film', 2], ['A stretch break', 2], ['A map', 2], ['Silence', 2], ['A neck pillow', 2],
  ]),
  p('A thing you would do if you were invisible', [
    ['Eavesdrop', 22], ['Watch people', 15], ['Take food', 12], ['Scare someone', 9], ['Skip the queue', 8],
    ['Read over shoulders', 7], ['Sleep anywhere', 5], ['Travel for free', 5], ['Prank friends', 4], ['Take a book', 3],
    ['Follow someone', 3], ['Dance in public', 2], ['Try on clothes', 2], ['Listen to a meeting', 2], ['Cheat at a game', 1],
  ]),
  p('Something that feels like a warm hug', [
    ['Soup', 20], ['A blanket', 18], ['A hot bath', 13], ['A fire', 9], ['A dog', 8],
    ['A friend', 6], ['Fresh bread', 5], ['Your bed', 4], ['A cardigan', 3], ['Tea', 3],
    ['A call from home', 3], ['Rain outside', 2], ['A familiar song', 2], ['Family dinner', 2], ['Slippers', 2],
  ]),
  p('Something that is worth waiting for', [
    ['Sunrise', 22], ['Fresh bread', 16], ['A holiday', 12], ['A reply', 9], ['A good film', 7],
    ['A parcel', 6], ['A train', 4], ['Pizza', 4], ['A concert', 3], ['A proposal', 3],
    ['Traffic to clear', 3], ['The weekend', 3], ['Coffee', 2], ['A baby', 2], ['First snow', 2],
  ]),
  p('A thing people do at a concert', [
    ['Sing along', 26], ['Film it', 15], ['Jump', 11], ['Clap', 9], ['Queue for drinks', 7],
    ['Dance', 6], ['Cheer', 5], ['Push to the front', 4], ['Lose your voice', 3], ['Look for friends', 3],
    ['Buy merch', 3], ['Photo of the stage', 2], ['Hug a stranger', 2], ['Cry', 2], ['Leave early', 2],
  ]),
  p('Something that makes a song good', [
    ['A beat', 24], ['The lyrics', 18], ['A memory', 11], ['The chorus', 9], ['A voice', 8],
    ['A guitar solo', 5], ['The bass', 4], ['A bridge', 3], ['The mood', 3], ['A hook', 3],
    ['A duet', 2], ['A sample', 2], ['A key change', 2], ['The drums', 2], ['Nostalgia', 2],
  ]),
  p('Something you would do with a winning lottery ticket', [
    ['Travel', 26], ['Buy a house', 18], ['Quit work', 12], ['Help family', 9], ['Invest', 6],
    ['Buy a car', 5], ['Give to charity', 4], ['Buy a boat', 3], ['Go to space', 3], ['Buy a football club', 2],
    ['Hire a chef', 2], ['Sleep', 2], ['Party', 2], ['Keep it secret', 2], ['Move abroad', 2],
  ]),
  p('A thing you regret saying', [
    ['Something mean', 24], ['A secret', 15], ['I am fine', 11], ['A joke that landed badly', 9], ['A promise', 7],
    ['A lie', 6], ['Something in anger', 5], ['A confession', 4], ['No', 4], ['An opinion', 3],
    ['A name', 3], ['Too much', 3], ['A goodbye', 3], ['Nothing', 2], ['A comment on a photo', 2],
  ]),
  p('Something that scares a child', [
    ['The dark', 28], ['Monsters', 17], ['Thunder', 12], ['Clowns', 9], ['The dentist', 6],
    ['Dogs', 5], ['A vacuum', 4], ['Heights', 4], ['The basement', 3], ['Strangers', 3],
    ['Spiders', 2], ['The doctor', 2], ['Shadows', 2], ['Loud noises', 2], ['Being lost', 2],
  ]),
  p('Something that makes you feel proud', [
    ['Finishing a project', 22], ['Helping someone', 17], ['A promotion', 11], ['Learning a skill', 9], ['Cooking a meal', 6],
    ['Being on time', 5], ['A clean house', 4], ['Running a race', 4], ['Speaking up', 3], ['A good grade', 3],
    ['Saving money', 3], ['Saying no', 2], ['A compliment', 2], ['Your kids', 2], ['Surviving the week', 2],
  ]),
  p('Something that is better shared', [
    ['Pizza', 22], ['A bottle of wine', 16], ['A secret', 12], ['A taxi', 9], ['A dessert', 8],
    ['A film', 5], ['A holiday', 5], ['A problem', 4], ['A playlist', 3], ['A plate of chips', 3],
    ['A song', 2], ['A blanket', 2], ['A room', 2], ['Good news', 2], ['A joke', 2],
  ]),
  // RIDGE-END
];

const banded = (band: Band, list: BankEntry[]): (BankEntry & { band: Band })[] =>
  list.map((entry) => ({ ...entry, band }));

export const BANK: (BankEntry & { band: Band })[] = [
  ...banded(0, WOODS),
  ...banded(1, FLATS),
  ...banded(2, TUNDRA),
  ...banded(3, RIDGE),
];

/** Weights become whole percentages that always add up to one hundred. */
export function normaliseWeights(weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0) || 1;
  const exact = weights.map((weight) => (Math.max(0, weight) / total) * 100);
  const whole = exact.map(Math.floor);
  let spare = 100 - whole.reduce((sum, weight) => sum + weight, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < order.length && spare > 0; i++) {
    whole[order[i].index] += 1;
    spare -= 1;
  }
  return whole;
}

export function promptId(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
