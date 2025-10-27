# NCBA Till STK Push & Dynamic QR Code API (2024)

NCBA TILL STK PUSH & DYNAMIC QR CODE API 

API Specification Document 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Contents 

BACKGROUND 

1 

STK PUSH 

i. 

Token Generation 

Request 

Authorization 

Response 

ii. 

Initiate STK Push 

Request 

Sample Payload 

Response 

iii. 

STK Push Query 

Request 

Sample Payload 

Response 

2  QR CODE 

i. 

Token Generation 

Request 

Authorization 

Response 

ii. 

Generate QR 

Request 

Sample Payload (without narration) 

Sample Payload (with narration) 

Response 

           3 

           3 

3 

3 

3 

3 

4 

4 

4 

5 

5 

5 

5 

5 

           6 

6 

6 

6 

6 

6 

6 

7 

7 

7 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
BACKGROUND 

The STK Push API on NCBA Till is responsible for receiving mobile payment (C2B) requests to be processed by 
pushing push a prompt to the payers phone for authorization. 

This simplifies the process of payments since the business can specify all the necessary parameters for the 
payment  (e.g.  amount,  short  code  etc.)  so  that  the  payer  just  enter  their  mobile  money  secrete  PIN  to 
authorize the payment. 

QR code API allows a business to avail dynamic QR codes to payers for scanning to pay. This also simplifies 
the process off payments by ensuring accurate details are captured while making a payment to a business 
merchant. 

To enjoy these services, the business merchants (customers) are required to; 

a)  Hold an Account at NCBA where mobile funds shall be credited 

b)  Has an active NCBA Till short code via Paybill 880100 

c)  Develop and integrate to the STK Push API or the QR Code API as per below specifications 

d)  Submit a signed instruction/letter to the bank for completion of the integration; 

Share a user name and a secret key on the letter. 

1  STK PUSH 

BASE_URL = https://c2bapis.ncbagroup.com 

i. 

Token Generation 

This endpoint is used to retrieve an authorization token 

Request 

Method 
GET 

URL 
BASE_URL/payments/api/v1/auth/token 

Type 
HEAD 

Params 
Authorization (Basic) 

Values 
string 

Authorization 

Method 
Username 
Password 

Basic Auth 
<username> 
<password> 

Response 

Status 
200 

Response 
{ 
    "access_token": "JWT ACCESS TOKEN", 
    "token_type": "Bearer", 
    "expires_in": 18000, 
    "status": 200 
} 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
 
 
401 

500 

access_token (string) - all subsequent API calls must have this in the Authorization 
bearer header  
{ 
    "message": "Invalid API credentials", 
    "status": "401" 
} 
{ 
    "message": "Error", 
    "status": "500" 
} 

ii. 

Initiate STK Push 

This endpoint is used to initiate a SIM Toolkit (STK) push transaction. 

Request 

Method 
POST 

URL 
BASE_URL/payments/api/v1/stk-push/initiate 

Type 
HEAD 

POST 
POST 
POST 
POST 
POST 
POST 

Params 
Authorization (Bearer access_token) 

TelephoneNo 
Amount 
PayBillNo 
AccountNo 
Network 
TransactionType 

Values 
String 

string 
string 
string 
string 
string 
string 

access_token 
The  access_token that was given in response to /payments/api/v1/auth/token 

Sample Payload 

Method 
RAW JSON 

URL 
{ 
    "TelephoneNo": "254XXXXXXXX", 
    "Amount": "AMOUNT", 
    "PayBillNo": "PAYBILL NUMBER", 
    "AccountNo": “ACCOUN NUMBER", 
    "Network": "Safaricom", 
    "TransactionType": "CustomerPayBillOnline" 
} 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
 
 
 
 
 
 
 
 
 
 
Response 

Status 
200 

200 

Response 
{ 
    "TransactionID": "TRANSACTION ID", 
    "StatusCode": "STATUS CODE", 
    "StatusDescription": "DESCRIPTION", 
    "ReferenceID": "REFERENCE ID" 
} 
{ 
    "TransactionID": null, 
    "StatusCode": "1", 
    "StatusDescription": "Failure reason", 
    "ReferenceID": null 
} 

iii. 

STK Push Query 

This endpoint is used to query the status of a previous STK push transaction. 

Request 

Method 
POST 

URL 
BASE_URL/payments/api/v1/stk-push/query 

Type 
HEAD 
POST 

Params 
Authorization (Bearer access_token) 
TransactionID 

Values 
string  
string 

access_token 
The  access_token that was given in response to /payments/api/v1/auth/token 

Sample Payload 

Method 
RAW JSON 

URL 
{ 
   "TransactionID": "TRANSACTION ID"  // transaction id from stk push initiate response 
} 

Response 

Status 
200 

200 

Response 
{ 
    "status": “SUCCESS", 
    "description": "Success" 
} 

{ 
    "status": "FAILED", 
    "description": "System internal error." 
} 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
 
 
 
 
 
 
 
2  QR CODE 

This endpoint is used to generate a payment base 64 QR code image 

BASE_URL = https://c2bapis.ncbagroup.com 

i. 

Token Generation 

This endpoint is used to retrieve an authorization token 

Request 

Method 
POST 

URL 
BASE_URL/payments/api/v1/auth/token 

Type 
HEAD 

Params 
Authorization (Basic) 

Values 
string 

Authorization 

Method 
Username 
Password 

Basic Auth 
<username> 
<password> 

Response 

Status 
200 

Response 
{ 
    "access_token": "JWT ACCESS TOKEN", 
    "token_type": "Bearer", 
    "expires_in": 18000, 
    "status": 200 
} 

401 

500 

access_token (string) - all subsequent API calls must have this in the Authorization 
bearer header  
{ 
    "message": "Invalid API credentials", 
    "status": "401" 
} 
{ 
    "message": "Error", 
    "status": "500" 
} 

ii.  Generate QR 

This endpoint is used to generate 64 base QR code for each payment request. 

Request 

Method 

URL 

POST 

BASE_URL/payments/api/v1/qr/generate 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
 
 
 
Type 

Params 

HEAD 
POST 
POST 

Authorization (Bearer access_token) 
till 
amount (optional field) 

Values 

string 
string 
number 

access_token 
The  access_token that was given in response to /payments/api/v1/auth/token 

Sample Payload (without narration) 

Method 

URL 

RAW JSON 

{ 
    "till": "PAY100D", 
    "amount": 1 // optional 
} 

Sample Payload (with narration) 

Method 

URL 

RAW JSON 

{ 
    "till": "PAY100D#narration", 
    "amount": 1 // optional 
} 

Response 

Status 

Response 

200 

{ 
    "StatusDescription": "Success", 
    "Base64QrCode": 
"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQAQAAAACoxAthA
AACJUlEQVR4Xu2Vy3EkMQxDO4POP0tlMB48UNKUfXDpYLYPQM/qQ+LxgpL3eh3r+l74XUFOF
eRUQU4V5FRBThXkVEFOFeRUrci40K1dyz3e37t867e6QdoRrqz07SsAenqC9CJyDHl0dHPsVKsb
5ClEPrw6UqwpQZ5GOBhhQpAnkVrd177GmJ+eIK2I/h9ahh9fdYN0I1NOUaFxYsq0TgX51N8igx
bvCqOjG8TnEdqDtCPv8qBvk6sqC6W6ikH6EJrC6qPkLIfcxFtMkE6EmtZ7mTVIdk3TsRSkD7EJGx
ec80QXLkg3opr93l3g06DKOEgzIsuuOtg1wefvUQbpQNQ0iAOnn5eM7I46SCeinMjSga6+J8x
mkHbkFkRk1fFeGe4cg/QilWKl5vzqUCj/gvQir5mgOuSqwj4wKkg7sgw6OTeXOBDxGhqkD4HR
Wj2yM86ADyJIK3Jjx+sYneOcVWyQXsTtl4giVYAnXc8K0o64uX1FUfG0WoO0Ir4KwKifXxWDNhe
kF+FpyWeP7rJ4Z9WwIN3ITVSys9eVEXPOzDJIJ0LdziJGPTSnfM0kgzQiUzKpO3dqNyODWK2I+ljIl
NXZOlIAUg7Si3Cdrtn05dIM4CD9yNDDcmR+WvCX6jPkIM8h1AvisInJBOlHXvz8oOxnDjOCPIEU
KK8HbJdZ3YN0I1XUnz5ddqC6MqX4IJ3IiYKcKsipgpwqyKmCnCrIqYKcKsip/i3yBXyWCwlIxS3zA
AAAAElFTkSuQmCC", 
    "StatusCode": "0" 
} 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
 
 
 
200 

{ 
    "StatusCode": "2", 
    "StatusDescription": "Failure reason", 
    "Base64QrCode": ""} 

                                                                                                 ©NCBA Bank PLC 2024 | NCBA Till STK Push & dynamic QR Code APIs 

 
