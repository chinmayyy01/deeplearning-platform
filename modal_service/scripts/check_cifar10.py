import modal

load_cifar10 = modal.Function.from_name(
    "deep-learning-platform",
    "load_cifar10"
)

try:
    result = load_cifar10.remote(max_samples=10)
    print("CIFAR-10 loaded successfully!")
    print(f"Dataset name: {result['dataset_name']}")
    print(f"Image shape info: channels={result['image_channels']}, height={result['image_height']}, width={result['image_width']}")
    print(f"X shape: {len(result['X'])} samples")
    print(f"y shape: {len(result['y'])} labels")
    print(f"First sample X shape: {len(result['X'][0])}x{len(result['X'][0][0])}x{len(result['X'][0][0][0])}")
except Exception as e:
    print(f"Error loading CIFAR-10: {e}")
    import traceback
    traceback.print_exc()
