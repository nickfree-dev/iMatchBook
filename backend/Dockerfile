FROM php:8.2-apache

# Install PDO, PDO MySQL, bcmath, zip, and grpc extensions
RUN apt-get update && apt-get install -y git unzip libzip-dev zlib1g-dev \
    && pecl install grpc \
    && docker-php-ext-enable grpc \
    && docker-php-ext-install pdo pdo_mysql bcmath zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Increase upload size limit
RUN echo "upload_max_filesize = 64M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 64M" >> /usr/local/etc/php/conf.d/uploads.ini

# Set working directory
WORKDIR /var/www/html

# Adjust permissions for uploads directory (if it exists, or create it)
# We do this at runtime usually, but ensuring it exists here helps.
RUN mkdir -p /var/www/html/backend/uploads && chmod 777 /var/www/html/backend/uploads
