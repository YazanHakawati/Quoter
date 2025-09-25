-- Zuccess Quoter Database Setup
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    colors TEXT[],
    protocols TEXT[],
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quotation_number VARCHAR(20) UNIQUE NOT NULL,
    quoter_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    building_location TEXT NOT NULL,
    extra_notes TEXT,
    selected_products JSONB NOT NULL,
    labor_days INTEGER,
    programming_fee DECIMAL(10,2) DEFAULT 0,
    installation_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_brand_category ON products(brand, category);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_quotations_quoter ON quotations(quoter_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Insert sample admin users
-- Note: In production, use proper password hashing (bcrypt, argon2, etc.)
INSERT INTO admin_users (username, password_hash, full_name, signature_url) VALUES
('yazan', 'yazan123', 'Yazan Hakawati', 'https://via.placeholder.com/200x100?text=Yazan+Signature'),
('jamal', 'jamal123', 'Jamal Mohammad', 'https://via.placeholder.com/200x100?text=Jamal+Signature'),
('anas', 'anas123', 'Anas Salem', 'https://via.placeholder.com/200x100?text=Anas+Signature')
ON CONFLICT (username) DO NOTHING;

-- Populate products from Products.csv snapshot
DELETE FROM products;

INSERT INTO products (name, description, category, brand, colors, protocols, price, image_url) VALUES
('MixSwitch Defy 4 keys grey', 'MixSwitch Defy 4 keys grey', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black', 'Orange'], ARRAY['Zigbee'], 339, 'https://i.postimg.cc/SxSNQY9z/image.png'),
('MixSwitch Defy Smart Panel grey', 'MixSwitch Defy Smart Panel grey', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black', 'Orange'], ARRAY['Zigbee'], 715, 'https://i.postimg.cc/FRBDzS1F/image.png'),
('MixSwitch Defy 4 keys white', 'MixSwitch Defy 4 keys white', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black', 'Orange'], ARRAY['Zigbee'], 339, 'https://i.postimg.cc/BvdR7RcB/image.png'),
('MixSwitch � Bach 8 keys (grey)', 'MixSwitch � Bach 8 keys (grey)', 'switches', 'orvibo', ARRAY['grey', 'Black', 'NavyBlue', 'Metalic Gold'], ARRAY['Zigbee'], 539, 'https://i.postimg.cc/q7kNhZCQ/image.png'),
('MixSwitch � Bach 4 keys (grey)', 'MixSwitch � Bach 4 keys (grey)', 'switches', 'orvibo', ARRAY['grey', 'Black', 'NavyBlue', 'Metalic Gold'], ARRAY['Zigbee'], 459, 'https://i.postimg.cc/1RJ1s79s/image.png'),
('MixSwitch smart remote control panel, grey color', 'MixSwitch smart remote control panel, grey color', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['Zigbee'], 239, 'https://i.postimg.cc/c12MgYM2/image.png'),
('MixSwitch 1 gang, grey color', 'MixSwitch 1 gang, grey color', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['Zigbee'], 269, 'https://i.postimg.cc/fy9dj2jF/image.png'),
('MixSwitch 2 gang, grey color', 'MixSwitch 2 gang, grey color', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['Zigbee'], 275, 'https://i.postimg.cc/QdrkHGGv/image.png'),
('MixSwitch 3 gang, grey color', 'MixSwitch 3 gang, grey color', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['Zigbee'], 289, 'https://i.postimg.cc/vZMfGr5s/image.png'),
('MixSwitch 4 gang switch, 2 gang scene switch, grey color', 'MixSwitch 4 gang switch, 2 gang scene switch, grey color', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['Zigbee'], 295, 'https://i.postimg.cc/gJr3fG8L/image.png'),
('1-gang US WiFi on/off switch', '1-gang US WiFi on/off switch', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['WiFi'], 239, 'https://i.postimg.cc/xd1mz9sp/image.png'),
('1-gang US WiFi switch + 1 remote switch', '1-gang US WiFi switch + 1 remote switch', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['WiFi'], 265, 'https://i.postimg.cc/150V782Y/image.png'),
('1-gang US WiFi Dimmer switch + 1 remote switch', '1-gang US WiFi Dimmer switch + 1 remote switch', 'switches', 'orvibo', ARRAY['grey', 'White', 'Black'], ARRAY['WiFi'], 349, 'https://i.postimg.cc/hj7fLvVs/image.png'),
('Zigbee Motion Sensor(PIR)', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 169, 'https://i.postimg.cc/QCHSkp0P/image.png'),
('Zigbee Door/Window Sensor', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 165, 'https://i.postimg.cc/kgxscMvn/image.png'),
('Zigbee Door/Window Sensor', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 179, 'https://i.postimg.cc/tgkzKrcw/image.png'),
('Detect human in the room', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 339, 'https://i.postimg.cc/prhYnPdM/image.png'),
('Zigbee Combustible Gas Sensor', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 189, 'https://i.postimg.cc/HWVft5cd/image.png'),
('Zigbee Smoke Sensor Pro', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 199, 'https://i.postimg.cc/cLZ9P8HK/image.png'),
('Zigbee Water Leakage Pro', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 139, 'https://i.postimg.cc/5tKsH7mv/image.png'),
('Zigbee Temperature & Humidity Sensor', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 159, 'https://i.postimg.cc/VL949LRz/image.png'),
('Zigbee Emergency Button', '', 'sensors', 'orvibo', ARRAY['White'], ARRAY['Zigbee'], 119, 'https://i.postimg.cc/kg1QwVtP/image.png'),
('Non-smart socket , white color', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 129, 'https://i.postimg.cc/ncs9ZdXg/image.png'),
('Non-smart socket, white color', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 129, 'https://i.postimg.cc/d0Fh2w5c/image.png'),
('Non-smart socket, white color 16A', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 129, 'https://i.postimg.cc/635TPzsH/image.png'),
('Non-smart socket, white color', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 99, 'https://i.postimg.cc/HLTLJ3Lp/image.png'),
('Non-smart PC socket', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 129, 'https://i.postimg.cc/9MMFbMTK/image.png'),
('Non-smart TV socket', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 129, 'https://i.postimg.cc/9XsZ45HC/image.png'),
('Non-smart TEL socket', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 129, 'https://i.postimg.cc/d0WTwg9M/image.png'),
('Non-smart SOS socket', '', 'sockets', 'orvibo', ARRAY['White', 'Gold', 'Black', 'Gray'], ARRAY['Zigbee'], 69, 'https://i.postimg.cc/CLjBzR4s/image.png'),
('MixPad M2 black L&N connection', 'Zigbee gateway with screen.\nBuilt-in four loops light.', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 951, 'https://i.postimg.cc/nhNh2ZTh/image.png'),
('M5 Smart voice control panel with Alexa Built-in', '1. Touch dimming, adjust brightness and color\n2.App Remote/Voice/Touch screen Control\n3.Alexa Built-in voice assisant\n4.Automation & Timer', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 1106, 'https://i.postimg.cc/nhNh2ZTh/image.png'),
('Gauss Smart Control Screen (Knob Screen Gateway) G1', '1. Five-dimensional interaction, built-in Zigbee gateway\n2. The perfect partner for light with the 0.01% level precision dimming control\n3. Retina-grade IPS HD\nscreen', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 811, 'https://i.postimg.cc/LX34mPSJ/image.png'),
('MixPad 7 Ultra Silver', 'Zigbee gateway with screen.\nBuilt-in four loops light.', 'panels', 'orvibo', ARRAY['Brown', 'Silver'], ARRAY['Zigbee'], 2605, 'https://i.postimg.cc/L6X4Mhbs/image.png'),
('MixPad 7', 'Zigbee gateway with screen.\nBuilt-in four loops light.', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 2104, 'https://i.postimg.cc/3wM3p1Jy/image.png'),
('MixPad X', 'Zigbee gateway with screen.\nBuilt-in two loops light.', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 3457, 'https://i.postimg.cc/6QdthZyM/image.png'),
('MixPad X Pro', 'Zigbee gateway with screen.\nVideo intercom indoor unit.', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 3457, 'https://i.postimg.cc/6QdthZyM/image.png'),
('Zigbee Minihub', 'Zigbee gateway, Zigbee Minihub without power adaptor?DC power adaptor needed', 'panels', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 240, 'https://i.postimg.cc/C1703VCD/image.png'),
('W40CZ', 'Zigbee Curtain motor(AC),built-in relay (Zigbee)', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 652, 'https://i.postimg.cc/BZ1cBc3T/image.png'),
('Track 0.1m', 'Rail for Curtain Motor W45CZ 0.1m', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 96, 'https://i.postimg.cc/pXbQGhVg/image.png'),
('Z20-C2', 'Zigbee Curtain Motor(Engineering version)', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 652, 'https://i.postimg.cc/vmB5g5X6/image.png'),
('Straight Track 0.1m', 'Rail for Curtain Motor Z20- C2 0.1m', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 111, 'https://i.postimg.cc/SsY8VqBS/image.png'),
('G35', 'Zigbee Tubular Motor', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 1179, ''),
('C20WZ', 'Wi-Fi Curtain motor with curtain rail 3M', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 553, 'https://i.postimg.cc/qq8KVwBW/image.png'),
('C20WZ', 'Wi-Fi Curtain motor with curtain rail 4M', 'curtains', 'orvibo', ARRAY['Original'], ARRAY['Zigbee'], 626, 'https://i.postimg.cc/qq8KVwBW/image.png'),
('WiFi Smart Door Lock C1', 'Supports password, fingerprint, NFC card, key and OTP unlock door lock.', 'access', 'orvibo', ARRAY['Original'], ARRAY['WiFi'], 1150, 'https://i.postimg.cc/Kjr1sYJ2/image.png'),
('V5 face Smart Door Lock - black', 'Supports face recognition, fingerprint, password, card, Android mobile phone NFC, OTP, video authorization, MixPad screen unlocking, mechanical key.\nBuilt-in door sensor.', 'access', 'orvibo', ARRAY['Original'], ARRAY['WiFi'], 2304, 'https://i.postimg.cc/qB867m05/image.png'),
('Zigbee Smart FCU AC Control Panel', 'Control the fan coil central AC', 'climate', 'orvibo', ARRAY['White', 'Black'], ARRAY['Zigbee'], 464, 'https://i.postimg.cc/zX2zDWLQ/image.png'),
('AirMaster Max 2022', 'Control VRV central AC.', 'climate', 'orvibo', ARRAY['Original'], ARRAY['Wired'], 2204, 'https://i.postimg.cc/HkfTXg94/image.png'),
('Tuya zigbee thermostat Switch?AC Switch', 'Tuya zigbee thermostat Switch?AC Switch, color: grey/ white/ black', 'climate', 'zuccess', ARRAY['White', 'Grey', 'Black'], ARRAY['Zigbee'], 428, 'https://i.postimg.cc/gJGr5ZB2/image.png'),
('Tuya zigbee thermostat Switch?AC Switch', 'red, green, white, black, grey, gold', 'climate', 'zuccess', ARRAY['White', 'Grey', 'Black'], ARRAY['Zigbee'], 556, 'https://i.postimg.cc/j5vCrSGQ/image.png'),
('BAC-002ALW Thermostat Temperature matt black', 'Zigbee Smart Central Air Conditioner Thermostat Temperature Controller Fan Coil Unit Works Amazon Alexa Echo Google Home 2 Pipe Tuya', 'climate', 'zuccess', ARRAY['White', 'Grey', 'Black'], ARRAY['Zigbee'], 296, 'https://i.postimg.cc/zvcBVPDy/image.png'),
('WDL-T9P', 'WiFi Smart Face Recohnition Door Lock IC card,Key,fingerprint,Face Recognition password,APP control 4200ma Lithium battery ', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 1765, 'https://i.postimg.cc/zvKzGDQc/image.png'),
('WDL-R5-2', 'Wifi Door Lock IC card,Key,fingerprint, password,APP control ', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 589, 'https://i.postimg.cc/tCGRmPZQ/image.png'),
('WDL-HG-200K', 'WiFi Door Lock Iron Gate Outdoor IC card,Key,fingerprint, password,APP control ', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 1231, 'https://i.postimg.cc/SNLQ0sCX/image.png'),
('5inch Intercom', '5 inch IPS LCD 720*1280, , echo cancellation, video intercom, access control, face recognition (default 2000, up to 20000), access cards (default 2000, up to 20000', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 1838, 'https://i.postimg.cc/7ZYkpNqc/image.png'),
('8inch Intercom', 'capacitive touch, Wi-Fi/4G optional, IP65, RS485 port, aluminum material, relay out, 13.56Mhz IC Card RF reader, NFC, wall-mounted, Linux OS, echo cancellation, video intercom, access control, ', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 2255, 'https://i.postimg.cc/7ZYkpNqc/image.png'),
('10inch Intercom', '', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 3014, 'https://i.postimg.cc/7ZYkpNqc/image.png'),
('AC-TPD01', 'Access Control System Door ', 'access', 'zuccess', ARRAY['Original'], ARRAY['WiFi'], 2539, 'https://i.postimg.cc/pLGHxnTd/image.png'),
('Dual/Triple pole socket', '', 'sockets', 'zuccess', ARRAY['Grey', 'Black', 'Gold', 'White'], ARRAY['Wired'], 48, 'https://i.postimg.cc/0jRK8ynz/image.png'),
('1 gang,Dual/Triple pole socket', '', 'sockets', 'zuccess', ARRAY['Grey', 'Black', 'Gold', 'White'], ARRAY['Wired'], 51, 'https://i.postimg.cc/HWX76bWX/image.png'),
('Dual/Triple pole USB socket', '', 'sockets', 'zuccess', ARRAY['Grey', 'Black', 'Gold', 'White'], ARRAY['Wired'], 66, 'https://i.postimg.cc/Hsm8RjjK/image.png'),
('16A Tripl pole socket', '', 'sockets', 'zuccess', ARRAY['Grey', 'Black', 'Gold', 'White'], ARRAY['Wired'], 38, 'https://i.postimg.cc/Nfx2cYH0/image.png'),
('M8 computer socket', '', 'sockets', 'zuccess', ARRAY['Grey', 'Black', 'Gold', 'White'], ARRAY['Wired'], 44, 'https://i.postimg.cc/HkscWKw9/image.png'),
('M8 TV socket', '', 'sockets', 'zuccess', ARRAY['Grey', 'Black', 'Gold', 'White'], ARRAY['Wired'], 44, 'https://i.postimg.cc/jjDDP7kW/image.png'),
('Zigbee Vibration Sensor 2*AAA Battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 118, 'https://i.postimg.cc/4NBW8DwD/image.png'),
('Zigbee Infrared human sensor 1*CR2032 Battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 134, 'https://i.postimg.cc/BnbMRmVX/image.png'),
('ZigbeeInfrared human sensor +Light Senor 1*CR2032 Battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 147, 'https://i.postimg.cc/R0nGZN9m/image.png'),
('Zigbee human presence sensor +Light Senor USB 5V 1A', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 240, 'https://i.postimg.cc/c4bQt0FL/image.png'),
('Zigbee human presence sensor +Light Senor', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 191, 'https://i.postimg.cc/0QbyKMZt/image.png'),
('Zigbee Flammable gas detector alarm USB 5V 1A', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 188, 'https://i.postimg.cc/bJWNxyBq/image.png'),
('Zigbee Gate magnetic sensor 1*CR2032 Battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 118, 'https://i.postimg.cc/9QCXtNJw/image.png'),
('Zigbee Temperature and humidity probe 1*CR2032 Battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 84, 'https://i.postimg.cc/Qdm86ky4/image.png'),
('Zigbee CO detectors 2*AA battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 247, 'https://i.postimg.cc/Qt9jdLxw/image.png'),
('Zigbee Water leakage detector 1*CR2032 battery', '', 'sensors', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 84, 'https://i.postimg.cc/rwVctRwS/image.png'),
('ZM16A', 'Roller Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 470, 'https://i.postimg.cc/yYwc1B64/image.png'),
('ZM25C', 'Roller Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 544, 'https://i.postimg.cc/tgb665VB/image.png'),
('ZM24A', 'Roller Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 524, 'https://i.postimg.cc/tTSnLGvc/image.png'),
('ZM02', '2Meter, Matter Wifi Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 560, 'https://i.postimg.cc/kG2RCYkg/image.png'),
('ZM03', '3Meter, Matter Wifi Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 595, 'https://i.postimg.cc/kG2RCYkg/image.png'),
('ZM04', '4Meter, Matter Wifi Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 630, 'https://i.postimg.cc/kG2RCYkg/image.png'),
('ZM05', '5Meter, Matter Wifi Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 665, 'https://i.postimg.cc/kG2RCYkg/image.png'),
('ZM06', '6Meter, Matter Wifi Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 800, 'https://i.postimg.cc/kG2RCYkg/image.png'),
('ZM07', '7Meter, Matter Wifi Curtain Motor', 'curtains', 'zuccess', ARRAY['Original'], ARRAY['Zigbee', 'WiFi'], 835, 'https://i.postimg.cc/kG2RCYkg/image.png'),
('6inch Tuya smart home gateway', '6 inch\n2+8G\n2*30W\n4-core CPU\nsupport Tuya Zigbee\nTuya gateway \nand has inbuilt ZigBee hub', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 1518, 'https://i.postimg.cc/Gp94G5mJ/image.png'),
('8inch Tuya smart home gateway', '8 inch\n2+8G\n4*30W\n4-core CPU\nsupport Tuya Zigbee\nTuya gateway \nand has inbuilt ZigBee hub', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 1977, 'https://i.postimg.cc/wvm3bRJ1/image.png'),
('7inch Tuya smart home gateway', '7 inch\n2+8G\n2*30W\n4-core CPU\nsupport Tuya Zigbee\nTuya gateway \nand has inbuilt ZigBee hub', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 1729, 'https://i.postimg.cc/wvm3bRJ1/image.png'),
('10inch Tuya smart home gateway', '10 inch\n2+8G\n4*30W\nAndroid 11\n4-core CPU\nsupport Tuya Zigbee\nTuya gateway \nand has inbuilt ZigBee hub', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 2515, 'https://i.postimg.cc/wvm3bRJ1/image.png'),
('12inch Tuya smart home gateway', '12 inch\n2+8G\n4*30W\nAndroid 11\n4-core CPU\nsupport Tuya Zigbee\nTuya gateway \nand has inbuilt ZigBee hub', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 3143, 'https://i.postimg.cc/fy7yM48Z/image.png'),
('Android intelligent control panel', '8 inch\n2+16G\n8*25W\n4-core CPU\n4 volume zone\nAndroid system-online music\nsupport Tuya Zigbee', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 2122, 'https://i.postimg.cc/Ghr9q2pp/image.png'),
('Tuya Android intelligent control panel', '7inch\n2+16G\n8*25W\nAndroid system-online music\nsupport Tuya smart home', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 1965, 'https://i.postimg.cc/Ghr9q2pp/image.png'),
('4-inch Tuya smart home gateway', '4inch\n1+8G\n4*30W\nAndroid 11system-online music\nsupport Tuya Zigbee\nTuya gateway \nand has inbuilt ZigBee hub', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 912, 'https://i.postimg.cc/8PHc3SFm/image.png'),
('4-inch Tuya smart home gateway', 'Alexa voice', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 912, 'https://i.postimg.cc/RZpFSLL3/image.png'),
('5-inch Tuya smart home gateway', 'Built-in Zigbee Gateway\nBuilt-in BLE Mesh\nIn-wall to replace a switch\nLocal control ( off-network)\nEdge compluting\nAlexa Built-in', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 1389, 'https://i.postimg.cc/GpBpHTXX/image.png'),
('Zigbee Wired HUB, USB 5V 1A', '', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 255, 'https://i.postimg.cc/GtR377df/image.png'),
('Zigbee Wireless HUB, USB 5V 1A', '', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 160, 'https://i.postimg.cc/GtR377df/image.png'),
('Matter ZIGBEE Wired HUB, type-c 5V 1A', '', 'panels', 'zuccess', ARRAY['Original'], ARRAY['Zigbee'], 381, 'https://i.postimg.cc/GtR377df/image.png'),
('M62-1K-ZTAL', '1 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 134, 'https://i.postimg.cc/X7M1hMMq/image.png'),
('M62-2K-ZTAL', '2 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 149, 'https://i.postimg.cc/L82C9z8M/image.png'),
('M62-3K-ZTAL', '3 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 165, 'https://i.postimg.cc/g00gRmhS/image.png'),
('M62-4K-ZTAL', '4 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 173, 'https://i.postimg.cc/gJCsfhTQ/image.png'),
('M62-2K2S-ZTAL', '2 gang+2 scene panel', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 160, 'https://i.postimg.cc/g00gRmhS/image.png'),
('M62-4K2S-ZTAL', '4 gang+2 scene panel', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 198, 'https://i.postimg.cc/g00gRmhS/image.png'),
('M62-3K3S-ZTAL', '3 gang + 3 scene panel', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 184, 'https://i.postimg.cc/g00gRmhS/image.png'),
('M6/MK-1AL', 'Single frame', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 38, 'https://i.postimg.cc/DzYBPHd2/image.png'),
('M6/MK-2AL', 'Double frame', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 44, 'https://i.postimg.cc/fWdBYH3N/image.png'),
('M6/MK-3AL', 'Triple frame', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 60, 'https://i.postimg.cc/PrkKymZ8/image.png'),
('M6/MK-4PCAL', 'Quadruple frame', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 76, 'https://i.postimg.cc/Nf7Dz57C/image.png'),
('M6/MK-5PCAL', 'Pentagonal frame', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 153, 'https://i.postimg.cc/13mBhsvm/image.png'),
('M8-K-ZTAL', '1 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 134, 'https://i.postimg.cc/N0LxFbhZ/image.png'),
('M8-2K-ZTAL', '2 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 149, 'https://i.postimg.cc/d0Xjydw3/image.png'),
('M8-3K-ZTAL', '3 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 157, 'https://i.postimg.cc/C5CGXQDn/image.png'),
('M8-4K-ZTAL', '4 gang', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 165, 'https://i.postimg.cc/QNcJFHPN/image.png'),
('M9-4K4S-ZTAL', '4 gang + 4 scene panel', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 196, 'https://i.postimg.cc/GmmFgzp9/image.png'),
('M12-1K-ZT', 'Intelligent switch/zero fire (two gang)', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 114, 'https://i.postimg.cc/4x2zDtKP/image.png'),
('M12-2K-ZT', 'Intelligent switch/zero fire (two gang)', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 126, 'https://i.postimg.cc/g0wvmJ8W/image.png'),
('M12-3K-ZT', 'Intelligent switch/zero fire (three gang)', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 137, 'https://i.postimg.cc/SsCCYvg1/image.png'),
('M12-4K-ZT', 'Intelligent switch/zero fire (four gang)', 'switches', 'zuccess', ARRAY['Gold', 'Black', 'Grey', 'White'], ARRAY['Zigbee'], 149, 'https://i.postimg.cc/zvNWCFMz/image.png');
-- Products are publicly readable
CREATE POLICY "Products are publicly readable" ON products
    FOR SELECT USING (true);

-- Quotations are only accessible by the quoter
CREATE POLICY "Quotations accessible by quoter" ON quotations
    FOR ALL USING (auth.uid()::text = quoter_id::text);

CREATE POLICY "Allow quotation inserts without session" ON quotations
    FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid()::text = quoter_id::text);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT ALL ON quotations TO authenticated;
GRANT ALL ON admin_users TO authenticated;

