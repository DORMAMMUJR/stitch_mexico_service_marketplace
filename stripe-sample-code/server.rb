require 'stripe'
require 'sinatra'

# This is your test secret API key.
# Don't put any keys in code. See https://docs.stripe.com/keys-best-practices.
stripe_secret_key = ENV['STRIPE_SECRET_KEY']
raise 'Missing STRIPE_SECRET_KEY' if stripe_secret_key.nil? || stripe_secret_key.strip.empty?
client = Stripe::StripeClient.new(stripe_secret_key)

set :static, true
set :port, 4242

YOUR_DOMAIN = ENV['APP_URL'] || 'http://localhost:4242'

post '/create-checkout-session' do
  content_type 'application/json'

  session = client.v1.checkout.sessions.create({
    line_items: [{
      # Provide the exact Price ID (for example, price_1234) of the product you want to sell
      price: '{{PRICE_ID}}',
      quantity: 1,
    }],
    mode: 'payment',
    success_url: YOUR_DOMAIN + '/success.html',
  })
  redirect session.url, 303
end
